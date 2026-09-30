import "server-only";
import { fingerprint, mapConcurrent, memo } from "@/lib/cache";
import type { ModelSettings } from "@/lib/domain/settings";
import type { Match, MatchOdds } from "@/lib/domain/types";
import { analyzeMatch } from "@/lib/engine/analyze";
import type { LeagueContext, MatchAnalysis } from "@/lib/engine/types";
import { getProvider } from "@/lib/providers";
import type { MatchCardDTO, MatchDetailDTO } from "./dto";
import { getSettings } from "./settings";

const DAY = 86_400_000;
const LEAGUE_WINDOW_DAYS = 150;

/** Moyennes de buts domicile/extérieur du championnat avant une date. */
export function getLeagueContext(competitionId: string, beforeIso: string): Promise<LeagueContext> {
  const day = beforeIso.slice(0, 10);
  return memo(`league:${competitionId}:${day}`, 6 * 3_600_000, async () => {
    const before = new Date(`${day}T00:00:00.000Z`).getTime();
    const matches = await getProvider().getMatches({
      competitionId,
      from: new Date(before - LEAGUE_WINDOW_DAYS * DAY).toISOString(),
      to: new Date(before).toISOString(),
      status: ["FINISHED"],
    });
    const scored = matches.filter((m) => m.score);
    if (scored.length === 0) return { avgHomeGoals: 1.5, avgAwayGoals: 1.2, avgTotalCorners: null, sample: 0 };
    const home = scored.reduce((s, m) => s + m.score!.home, 0) / scored.length;
    const away = scored.reduce((s, m) => s + m.score!.away, 0) / scored.length;
    return { avgHomeGoals: home, avgAwayGoals: away, avgTotalCorners: null, sample: scored.length };
  });
}

/** Classement mis en cache (5 min) : partagé par toutes les analyses d'une compétition. */
export function getStandingsCached(competitionId: string) {
  return memo(`standings:${competitionId}`, 5 * 60_000, () => getProvider().getStandings(competitionId)).catch(() => null);
}

async function computeAnalysis(match: Match, settings: ModelSettings, odds: MatchOdds | null) {
  const provider = getProvider();
  const before = match.kickoff;
  const [homeRecords, awayRecords, h2h, league, standings, availability] = await Promise.all([
    provider.getTeamForm(match.homeTeam.id, { before, limit: settings.formWindow }),
    provider.getTeamForm(match.awayTeam.id, { before, limit: settings.formWindow }),
    provider.getHeadToHead(match.homeTeam.id, match.awayTeam.id, { before, limit: 6 }),
    getLeagueContext(match.competition.id, before),
    getStandingsCached(match.competition.id),
    provider.getAvailability(match.id).catch(() => ({ home: null, away: null })),
  ]);
  const analysis = analyzeMatch(
    { match, homeRecords, awayRecords, h2h, odds, availability, league, standings },
    settings,
  );
  return { analysis, homeRecords, awayRecords, h2h, standings, availability };
}

/**
 * Analyse pré-match d'un match (données strictement antérieures au coup
 * d'envoi). Mise en cache 2 minutes (les cotes évoluent).
 */
export async function getAnalysisForMatch(match: Match, settingsOverride?: ModelSettings) {
  const settings = settingsOverride ?? (await getSettings()).model;
  const key = `analysis:${match.id}:${fingerprint(settings)}`;
  return memo(key, 120_000, async () => {
    const odds = await getProvider().getOdds(match.id).catch(() => null);
    const result = await computeAnalysis(match, settings, odds);
    return { ...result, odds };
  });
}

export async function getMatchDetail(matchId: string): Promise<MatchDetailDTO | null> {
  const provider = getProvider();
  const match = await provider.getMatch(matchId);
  if (!match) return null;
  try {
    const { analysis, homeRecords, awayRecords, h2h, standings, availability, odds } = await getAnalysisForMatch(match);
    const insufficient = homeRecords.length < 3 || awayRecords.length < 3;
    return {
      match,
      analysis: insufficient ? null : analysis,
      analysisError: insufficient ? "Historique insuffisant pour produire une analyse fiable (moins de 3 matchs récents)." : null,
      homeRecords,
      awayRecords,
      h2h,
      odds,
      standings,
      availability,
      provider: provider.info,
    };
  } catch (err) {
    console.error("[analysis] échec", matchId, err);
    return {
      match,
      analysis: null,
      analysisError: "Les données nécessaires à l'analyse sont momentanément indisponibles.",
      homeRecords: [],
      awayRecords: [],
      h2h: [],
      odds: null,
      standings: null,
      availability: { home: null, away: null },
      provider: provider.info,
    };
  }
}

function toCard(
  match: Match,
  analysis: MatchAnalysis | null,
  odds: MatchOdds | null,
  positions: Map<string, number>,
  thresholds: { minEdge: number; minConfidence: number } = { minEdge: 0, minConfidence: 0 },
): MatchCardDTO {
  const p = (k: string) => analysis?.markets.find((m) => m.key === k)?.probability ?? 0;
  let bestEdge: MatchCardDTO["bestEdge"] = null;
  if (analysis && match.status === "SCHEDULED") {
    for (const m of analysis.markets) {
      const eligible = m.edge !== null && m.odds !== null && m.edge * 100 >= thresholds.minEdge && m.confidence.score >= thresholds.minConfidence;
      if (eligible && (bestEdge === null || m.edge! > bestEdge.edge)) {
        bestEdge = { key: m.key, label: m.label, edge: m.edge!, odds: m.odds!, probability: m.probability };
      }
    }
    if (bestEdge && bestEdge.edge <= 0) bestEdge = null;
  }
  return {
    match,
    homeForm: analysis?.profiles.home.form ?? [],
    awayForm: analysis?.profiles.away.form ?? [],
    homePosition: positions.get(match.homeTeam.id) ?? null,
    awayPosition: positions.get(match.awayTeam.id) ?? null,
    odds1x2: odds
      ? { home: odds.markets["1X2_HOME"] ?? null, draw: odds.markets["1X2_DRAW"] ?? null, away: odds.markets["1X2_AWAY"] ?? null }
      : null,
    oddsIsDemo: odds?.isDemo ?? false,
    probabilities: analysis
      ? { home: p("1X2_HOME"), draw: p("1X2_DRAW"), away: p("1X2_AWAY"), over25: p("OU_2_5_OVER"), btts: p("BTTS_YES") }
      : null,
    expectedGoals: analysis ? { home: analysis.expectedGoals.home, away: analysis.expectedGoals.away } : null,
    bestEdge,
    dataQuality: analysis?.dataQuality.score ?? null,
    marketCount: analysis?.markets.length ?? 0,
  };
}

/** Enrichit une liste de matchs (forme, classement, cotes, probabilités). */
export async function buildMatchCards(matches: Match[]): Promise<MatchCardDTO[]> {
  const settings = (await getSettings()).model;
  const competitions = [...new Set(matches.map((m) => m.competition.id))];
  const standings = await Promise.all(competitions.map((c) => getStandingsCached(c)));
  const positions = new Map<string, number>();
  standings.forEach((s) => s?.rows.forEach((r) => positions.set(r.team.id, r.position)));

  return mapConcurrent(matches, 6, async (match) => {
    if (match.status === "POSTPONED" || match.status === "CANCELLED") return toCard(match, null, null, positions);
    try {
      const { analysis, odds, homeRecords, awayRecords } = await getAnalysisForMatch(match, settings);
      const ok = homeRecords.length >= 3 && awayRecords.length >= 3;
      return toCard(match, ok ? analysis : null, odds, positions, settings);
    } catch (err) {
      console.error("[cards] analyse impossible", match.id, err);
      return toCard(match, null, null, positions);
    }
  });
}
