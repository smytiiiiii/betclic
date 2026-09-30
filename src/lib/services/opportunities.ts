import "server-only";
import { fingerprint, mapConcurrent, memo } from "@/lib/cache";
import { env } from "@/lib/config/env";
import { MARKET_GROUP_LABELS } from "@/lib/domain/markets";
import { getProvider } from "@/lib/providers";
import { addDays, zonedDayRange } from "@/lib/time";
import { getAnalysisForMatch } from "./analysis";
import type { OpportunityDTO } from "./dto";
import { todayKey } from "./matches";
import { getSettings } from "./settings";

export interface OpportunityQuery {
  days?: number;
  minEdge?: number;
  minConfidence?: number;
}

/**
 * Liste les marchés des matchs à venir dont la probabilité estimée par le
 * modèle dépasse la probabilité implicite de la cote. Il s'agit d'écarts
 * statistiques, jamais d'une garantie de gain.
 */
export async function getOpportunities(query: OpportunityQuery = {}): Promise<{ items: OpportunityDTO[]; analyzedMatches: number; minEdge: number; minConfidence: number }> {
  const settings = (await getSettings()).model;
  const days = Math.min(Math.max(query.days ?? 3, 1), 7);
  const minEdge = query.minEdge ?? settings.minEdge;
  const minConfidence = query.minConfidence ?? settings.minConfidence;
  const key = `opps:${todayKey()}:${days}:${minEdge}:${minConfidence}:${fingerprint(settings)}`;

  return memo(key, 120_000, async () => {
    const tz = env().APP_TIMEZONE;
    const today = todayKey();
    const matches = await getProvider().getMatches({
      from: new Date().toISOString(),
      to: zonedDayRange(addDays(today, days - 1), tz).end.toISOString(),
      status: ["SCHEDULED"],
    });

    const perMatch = await mapConcurrent(matches, 6, async (match) => {
      try {
        const { analysis, odds, homeRecords, awayRecords } = await getAnalysisForMatch(match, settings);
        if (!odds || homeRecords.length < 3 || awayRecords.length < 3) return [];
        return analysis.markets
          .filter(
            (m) =>
              m.edge !== null &&
              m.odds !== null &&
              m.edge * 100 >= minEdge &&
              m.confidence.score >= minConfidence,
          )
          .map(
            (m): OpportunityDTO => ({
              id: `${match.id}:${m.key}`,
              match: {
                id: match.id,
                kickoff: match.kickoff,
                status: match.status,
                competition: match.competition,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                isDemo: match.isDemo,
              },
              marketKey: m.key,
              marketLabel:
                m.key === "1X2_HOME" ? `Victoire ${match.homeTeam.shortName}` : m.key === "1X2_AWAY" ? `Victoire ${match.awayTeam.shortName}` : m.label,
              group: MARKET_GROUP_LABELS[m.group],
              odds: m.odds!,
              probability: m.probability,
              impliedProbability: m.impliedProbability!,
              fairImpliedProbability: m.fairImpliedProbability,
              edge: m.edge!,
              expectedValue: m.expectedValue!,
              confidence: m.confidence.score,
              confidenceLevel: m.confidence.level,
              explanation: m.explanation,
              oddsIsDemo: odds.isDemo,
              bookmaker: odds.bookmaker,
            }),
          );
      } catch (err) {
        console.error("[opportunities] analyse impossible", match.id, err);
        return [];
      }
    });

    return {
      items: perMatch.flat().sort((a, b) => b.edge - a.edge),
      analyzedMatches: matches.length,
      minEdge,
      minConfidence,
    };
  });
}
