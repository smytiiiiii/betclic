import "server-only";
import { cache } from "react";
import { fingerprint, mapConcurrent, memo } from "@/lib/cache";
import { env } from "@/lib/config/env";
import { MARKETS, MARKET_GROUP_LABELS, settleMarket } from "@/lib/domain/markets";
import { argmax, brierScore, calibration, logLoss, type Outcome1X2 } from "@/lib/engine/evaluation";
import { round } from "@/lib/engine/math";
import { getProvider } from "@/lib/providers";
import { localDateKey } from "@/lib/time";
import { getAnalysisForMatch } from "./analysis";
import type { BacktestRecord, BacktestSummary } from "./dto";
import { getSettings } from "./settings";

const DAY = 86_400_000;
const MAX_MATCHES = 400;

/**
 * Backtest « walk-forward » : pour chaque match terminé de la période, le
 * modèle est recalculé avec les seules données antérieures au coup d'envoi,
 * puis comparé au résultat réel et aux cotes de clôture.
 *
 * Avec le provider de démo, ces chiffres portent sur des données FICTIVES et
 * ne constituent en aucun cas une performance réelle.
 */
export const getBacktest = cache(async (): Promise<BacktestSummary> => {
  const settings = (await getSettings()).model;
  const e = env();
  const day = localDateKey(new Date(), e.APP_TIMEZONE);
  return memo(`backtest:${day}:${fingerprint(settings)}`, 30 * 60_000, async () => {
    const provider = getProvider();
    const to = new Date();
    const from = new Date(to.getTime() - e.BACKTEST_DAYS * DAY);
    const matches = (
      await provider.getMatches({ from: from.toISOString(), to: to.toISOString(), status: ["FINISHED"] })
    )
      .filter((m) => m.score)
      .slice(-MAX_MATCHES);

    const modelScores = { brier: 0, logLoss: 0, correct: 0, n: 0 };
    const marketScores = { brier: 0, logLoss: 0, correct: 0, n: 0 };
    const calibrationPoints: { p: number; hit: boolean }[] = [];
    const records: BacktestRecord[] = [];
    let probabilitiesComputed = 0;

    await mapConcurrent(matches, 6, async (match) => {
      try {
        const { analysis, odds, homeRecords, awayRecords } = await getAnalysisForMatch(match, settings);
        if (homeRecords.length < 5 || awayRecords.length < 5) return;
        const score = match.score!;
        const outcome: Outcome1X2 = score.home > score.away ? "H" : score.home === score.away ? "D" : "A";
        const p = (k: string) => analysis.markets.find((m) => m.key === k)?.probability ?? 0;
        const triplet = { home: p("1X2_HOME"), draw: p("1X2_DRAW"), away: p("1X2_AWAY") };
        probabilitiesComputed += analysis.markets.length;

        modelScores.brier += brierScore(triplet, outcome);
        modelScores.logLoss += logLoss(triplet, outcome);
        modelScores.correct += argmax(triplet) === outcome ? 1 : 0;
        modelScores.n += 1;

        calibrationPoints.push(
          { p: triplet.home, hit: outcome === "H" },
          { p: triplet.draw, hit: outcome === "D" },
          { p: triplet.away, hit: outcome === "A" },
          { p: p("OU_2_5_OVER"), hit: score.home + score.away > 2.5 },
          { p: p("BTTS_YES"), hit: score.home > 0 && score.away > 0 },
        );

        const o = odds?.markets;
        if (o?.["1X2_HOME"] && o["1X2_DRAW"] && o["1X2_AWAY"]) {
          const inv = [1 / o["1X2_HOME"], 1 / o["1X2_DRAW"], 1 / o["1X2_AWAY"]];
          const sum = inv[0] + inv[1] + inv[2];
          const market = { home: inv[0] / sum, draw: inv[1] / sum, away: inv[2] / sum };
          marketScores.brier += brierScore(market, outcome);
          marketScores.logLoss += logLoss(market, outcome);
          marketScores.correct += argmax(market) === outcome ? 1 : 0;
          marketScores.n += 1;
        }

        // Sélections du modèle : écart ≥ seuil et confiance suffisante.
        const picks = analysis.markets.filter(
          (m) => m.edge !== null && m.odds !== null && m.edge * 100 >= settings.minEdge && m.confidence.score >= settings.minConfidence,
        );
        if (picks.length === 0) return;
        let totalCorners: number | null = null;
        if (picks.some((m) => m.group === "CORNERS")) {
          const snap = await provider.getLiveSnapshot(match.id).catch(() => null);
          const ch = snap?.stats?.home.corners;
          const ca = snap?.stats?.away.corners;
          totalCorners = typeof ch === "number" && typeof ca === "number" ? ch + ca : null;
        }
        for (const m of picks) {
          const won = settleMarket(m.key, score, totalCorners);
          if (won === null) continue;
          records.push({
            id: `${match.id}:${m.key}`,
            date: match.kickoff,
            matchId: match.id,
            matchLabel: `${match.homeTeam.shortName} – ${match.awayTeam.shortName}`,
            competition: match.competition.name,
            marketKey: m.key,
            marketLabel: m.key === "1X2_HOME" ? `Victoire ${match.homeTeam.shortName}` : m.key === "1X2_AWAY" ? `Victoire ${match.awayTeam.shortName}` : m.label,
            odds: m.odds!,
            probability: m.probability,
            impliedProbability: m.impliedProbability!,
            edge: m.edge!,
            confidence: m.confidence.score,
            won,
            profit: round(won ? m.odds! - 1 : -1, 4),
            score: `${score.home}-${score.away}`,
          });
        }
      } catch (err) {
        console.error("[backtest] match ignoré", match.id, err);
      }
    });

    records.sort((a, b) => b.date.localeCompare(a.date));
    const won = records.filter((r) => r.won).length;
    const profit = records.reduce((s, r) => s + r.profit, 0);

    const byDay = new Map<string, { profit: number; picks: number }>();
    for (const r of records) {
      const d = localDateKey(r.date, e.APP_TIMEZONE);
      const cur = byDay.get(d) ?? { profit: 0, picks: 0 };
      cur.profit += r.profit;
      cur.picks += 1;
      byDay.set(d, cur);
    }
    let cumulative = 0;
    const series = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        cumulative += v.profit;
        return { date, profit: round(v.profit, 2), cumulative: round(cumulative, 2), picks: v.picks };
      });

    const groups = new Map<string, { count: number; won: number; profit: number }>();
    for (const r of records) {
      const g = MARKET_GROUP_LABELS[MARKETS[r.marketKey].group];
      const cur = groups.get(g) ?? { count: 0, won: 0, profit: 0 };
      cur.count += 1;
      cur.won += r.won ? 1 : 0;
      cur.profit += r.profit;
      groups.set(g, cur);
    }

    const avg = (s: { brier: number; logLoss: number; correct: number; n: number }) => ({
      brier: s.n ? round(s.brier / s.n, 4) : 0,
      logLoss: s.n ? round(s.logLoss / s.n, 4) : 0,
      accuracy: s.n ? round(s.correct / s.n, 4) : 0,
    });

    return {
      isDemo: provider.info.isDemo,
      from: from.toISOString(),
      to: to.toISOString(),
      matchesEvaluated: modelScores.n,
      probabilitiesComputed,
      model: avg(modelScores),
      market: marketScores.n ? avg(marketScores) : null,
      valuePicks: {
        count: records.length,
        won,
        hitRate: records.length ? round(won / records.length, 4) : 0,
        staked: records.length,
        profit: round(profit, 2),
        roi: records.length ? round(profit / records.length, 4) : 0,
      },
      calibration: calibration(calibrationPoints),
      series,
      byGroup: [...groups.entries()].map(([group, v]) => ({
        group,
        count: v.count,
        hitRate: round(v.won / v.count, 4),
        roi: round(v.profit / v.count, 4),
      })),
      records,
      settingsMinEdge: settings.minEdge,
    };
  });
});
