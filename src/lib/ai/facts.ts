import { MARKETS } from "@/lib/domain/markets";
import type { MarketKey } from "@/lib/domain/types";
import type { MatchDetailDTO } from "@/lib/services/dto";

const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? null : Math.round(v * 100 * 10 ** d) / 10 ** d);
const r = (v: number | null | undefined, d = 2) => (v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d);

/**
 * Construit le paquet de faits transmis au LLM. Il ne contient QUE des
 * valeurs produites par le moteur ou fournies par la source de données :
 * c'est la seule base autorisée pour l'explication.
 */
export function buildFacts(detail: MatchDetailDTO, marketKey: MarketKey) {
  const { match, analysis } = detail;
  if (!analysis) throw new Error("Analyse indisponible");
  const market = analysis.markets.find((m) => m.key === marketKey);
  if (!market) throw new Error("Marché non calculé pour ce match");
  const { home, away } = analysis.profiles;

  const team = (p: typeof home) => ({
    matches_analysed: p.sample,
    /** V = victoire, N = nul, D = défaite ; du plus récent au plus ancien. */
    form_last5_most_recent_first: p.form.map((r) => (r === "W" ? "V" : r === "D" ? "N" : "D")).join(""),
    points_per_match_last5: p.pointsPerMatchLast5,
    goals_for_per_match_weighted: r(p.goalsFor),
    goals_against_per_match_weighted: r(p.goalsAgainst),
    venue: p.venue,
    venue_matches: p.venueSample,
    venue_goals_for_per_match: r(p.venueGoalsFor),
    venue_goals_against_per_match: r(p.venueGoalsAgainst),
    xg_for_per_match: r(p.xgFor),
    xg_against_per_match: r(p.xgAgainst),
    over_2_5_rate_pct: pct(p.summary.over25Rate, 0),
    btts_rate_pct: pct(p.summary.bttsRate, 0),
    clean_sheet_rate_pct: pct(p.summary.cleanSheetRate, 0),
    failed_to_score_rate_pct: pct(p.summary.failedToScoreRate, 0),
    corners_for_per_match: r(p.cornersFor),
    corners_against_per_match: r(p.cornersAgainst),
    rest_days: p.restDays,
    matches_last_14_days: p.matchesLast14Days,
  });

  let h2h: Record<string, number> | null = null;
  if (detail.h2h.length) {
    let w = 0;
    let l = 0;
    let goals = 0;
    for (const m of detail.h2h) {
      const isHome = m.homeTeam.id === match.homeTeam.id;
      const gf = isHome ? m.score.home : m.score.away;
      const ga = isHome ? m.score.away : m.score.home;
      goals += gf + ga;
      if (gf > ga) w++;
      else if (gf < ga) l++;
    }
    h2h = { matches: detail.h2h.length, home_team_wins: w, draws: detail.h2h.length - w - l, away_team_wins: l, avg_goals: r(goals / detail.h2h.length)! };
  }

  return {
    is_demo_data: match.isDemo,
    match: {
      home_team: match.homeTeam.name,
      away_team: match.awayTeam.name,
      competition: match.competition.name,
      kickoff_utc: match.kickoff,
      status: match.status,
    },
    market: {
      key: market.key,
      label: market.label,
      definition: MARKETS[market.key].description,
      estimated_probability_pct: pct(market.probability),
      fair_odds: market.fairOdds,
      probability_goals_model_pct: pct(market.probabilityGoalsModel),
      probability_xg_model_pct: pct(market.probabilityXgModel),
      confidence_score: market.confidence.score,
      confidence_level: market.confidence.level,
      confidence_reasons: market.confidence.reasons,
      data_used: market.dataUsed,
      bookmaker_odds: market.odds,
      odds_are_demo: detail.odds?.isDemo ?? null,
      implied_probability_pct: pct(market.impliedProbability),
      implied_probability_without_margin_pct: pct(market.fairImpliedProbability),
      bookmaker_margin_pct: pct(market.bookmakerMargin),
      statistical_gap_points: pct(market.edge),
      theoretical_expected_value_pct: pct(market.expectedValue),
    },
    expected_goals: {
      home: r(analysis.expectedGoals.home),
      away: r(analysis.expectedGoals.away),
      total: r(analysis.expectedGoals.total),
      goals_based_model: { home: r(analysis.expectedGoals.fromGoals.home), away: r(analysis.expectedGoals.fromGoals.away) },
      xg_based_model: analysis.expectedGoals.fromXg
        ? { home: r(analysis.expectedGoals.fromXg.home), away: r(analysis.expectedGoals.fromXg.away) }
        : null,
      analytical_adjustment_pct: pct(analysis.expectedGoals.adjustment - 1),
    },
    expected_corners: analysis.expectedCorners,
    method: {
      model: analysis.modelVersion,
      description:
        "Buts attendus estimés à partir des buts (et xG si disponibles) marqués/encaissés, pondérés par récence et rapportés aux moyennes du championnat, puis loi de Poisson corrigée Dixon-Coles pour obtenir la probabilité de chaque score.",
      recency_half_life_matches: analysis.settings.recencyHalfLife,
      xg_weight_pct: pct(analysis.expectedGoals.fromXg ? analysis.settings.xgBlend : 0, 0),
    },
    home_team_stats: team(home),
    away_team_stats: team(away),
    head_to_head: h2h,
    analytical_score: {
      home: analysis.analyticalScore.home,
      away: analysis.analyticalScore.away,
      factors: analysis.factors.map((f) => ({
        factor: f.label,
        available: f.available,
        weight_pct: pct(f.normalizedWeight, 0),
        value_minus1_to_1: r(f.value),
        home: f.homeDisplay,
        away: f.awayDisplay,
        detail: f.detail,
      })),
    },
    data_quality_score: analysis.dataQuality.score,
    player_availability: detail.availability.home || detail.availability.away ? detail.availability : "non fournie par la source",
    warnings: analysis.warnings,
    limitations: analysis.limitations,
  };
}

export type Facts = ReturnType<typeof buildFacts>;

/** Collecte toutes les valeurs numériques présentes dans les faits. */
export function collectNumbers(value: unknown, out = new Set<number>()): Set<number> {
  if (typeof value === "number" && Number.isFinite(value)) out.add(value);
  else if (typeof value === "string") {
    for (const m of value.matchAll(/-?\d+(?:[.,]\d+)?/g)) out.add(Number(m[0].replace(",", ".")));
  } else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectNumbers(v, out));
  return out;
}

/**
 * Vérifie que chaque nombre cité dans un texte figure (à l'arrondi près)
 * dans les faits fournis. Renvoie les nombres non retrouvés.
 */
export function unverifiedNumbers(texts: string[], facts: Facts): { checked: number; unverified: string[] } {
  const known = [...collectNumbers(facts)];
  // Seuils de marchés et constantes usuelles.
  known.push(0.5, 1.5, 2.5, 3.5, 8.5, 9.5, 10.5, 100, 90);
  const unverified: string[] = [];
  let checked = 0;
  for (const text of texts) {
    for (const m of text.matchAll(/-?\d+(?:[.,]\d+)?/g)) {
      const n = Math.abs(Number(m[0].replace(",", ".")));
      if (!Number.isFinite(n) || n <= 10 && Number.isInteger(n)) continue; // petits entiers (comptages) ignorés
      checked++;
      const ok = known.some((k) => {
        const a = Math.abs(k);
        return Math.abs(a - n) <= 0.051 || Math.abs(a * 100 - n) <= 0.51 || Math.abs(a - n) <= Math.max(0.51, a * 0.01);
      });
      if (!ok) unverified.push(m[0]);
    }
  }
  return { checked, unverified: [...new Set(unverified)] };
}
