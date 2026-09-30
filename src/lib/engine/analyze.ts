import { MARKETS } from "@/lib/domain/markets";
import type { ModelSettings } from "@/lib/domain/settings";
import type { MarketKey, StandingRow } from "@/lib/domain/types";
import { computeFactors } from "./factors";
import { clamp, negBinomialOver, round, scoreMatrix, shrinkRatio, sumMatrix } from "./math";
import { buildTeamProfile } from "./profile";
import type {
  AnalysisInput,
  ConfidenceInfo,
  ConfidenceLevel,
  ContextItem,
  DataQualityItem,
  MarketEstimate,
  MatchAnalysis,
  TeamProfile,
} from "./types";
import { MODEL_VERSION } from "./types";
import { compareWithOdds, fairOdds } from "./value";

const DEFAULT_HOME_GOALS = 1.5;
const DEFAULT_AWAY_GOALS = 1.2;
/** Dispersion de la binomiale négative pour les corners (surdispersion). */
const CORNERS_DISPERSION = 20;

const GOAL_MARKETS: Record<Exclude<MarketKey, `CORNERS_${string}`>, (h: number, a: number) => boolean> = {
  "1X2_HOME": (h, a) => h > a,
  "1X2_DRAW": (h, a) => h === a,
  "1X2_AWAY": (h, a) => h < a,
  DC_1X: (h, a) => h >= a,
  DC_X2: (h, a) => h <= a,
  DC_12: (h, a) => h !== a,
  OU_1_5_OVER: (h, a) => h + a >= 2,
  OU_1_5_UNDER: (h, a) => h + a <= 1,
  OU_2_5_OVER: (h, a) => h + a >= 3,
  OU_2_5_UNDER: (h, a) => h + a <= 2,
  OU_3_5_OVER: (h, a) => h + a >= 4,
  OU_3_5_UNDER: (h, a) => h + a <= 3,
  BTTS_YES: (h, a) => h > 0 && a > 0,
  BTTS_NO: (h, a) => h === 0 || a === 0,
};

export const GOAL_MARKET_KEYS = Object.keys(GOAL_MARKETS) as (keyof typeof GOAL_MARKETS)[];
const CORNER_LINES = [8.5, 9.5, 10.5] as const;

export function isGoalMarket(key: MarketKey): key is keyof typeof GOAL_MARKETS {
  return key in GOAL_MARKETS;
}

/** Prédicat de score exact pour un marché « buts » (utilisé pour les combinés). */
export function goalMarketPredicate(key: MarketKey): ((h: number, a: number) => boolean) | null {
  return isGoalMarket(key) ? GOAL_MARKETS[key] : null;
}

export function goalMarketProbabilities(matrix: number[][]): Record<keyof typeof GOAL_MARKETS, number> {
  const out = {} as Record<keyof typeof GOAL_MARKETS, number>;
  for (const key of GOAL_MARKET_KEYS) out[key] = sumMatrix(matrix, GOAL_MARKETS[key]);
  return out;
}

interface Lambdas {
  home: number;
  away: number;
}

function estimateLambdas(
  home: TeamProfile,
  away: TeamProfile,
  leagueHome: number,
  leagueAway: number,
  source: "goals" | "xg",
  priorMatches: number,
): Lambdas | null {
  const perTeam = (leagueHome + leagueAway) / 2;
  const pick = (profile: TeamProfile, kind: "for" | "against") => {
    if (source === "xg") return kind === "for" ? profile.xgFor : profile.xgAgainst;
    return kind === "for" ? profile.goalsFor : profile.goalsAgainst;
  };
  const hFor = pick(home, "for");
  const hAg = pick(home, "against");
  const aFor = pick(away, "for");
  const aAg = pick(away, "against");
  if (hFor === null || hAg === null || aFor === null || aAg === null) return null;

  // Ratio global (vs moyenne par équipe) et ratio spécifique au lieu
  // (vs moyenne domicile/extérieur), mélangés selon l'échantillon disponible.
  const blend = (overall: number, venueValue: number | null, venueAvg: number, venueN: number) => {
    const overallRatio = overall / perTeam;
    if (source === "xg" || venueValue === null || venueN === 0) return overallRatio;
    const venueRatio = venueValue / venueAvg;
    return (venueRatio * venueN + overallRatio * 3) / (venueN + 3);
  };

  const attackHome = shrinkRatio(blend(hFor, home.venueGoalsFor, leagueHome, home.venueSample), home.sample, priorMatches);
  const defenseAway = shrinkRatio(blend(aAg, away.venueGoalsAgainst, leagueHome, away.venueSample), away.sample, priorMatches);
  const attackAway = shrinkRatio(blend(aFor, away.venueGoalsFor, leagueAway, away.venueSample), away.sample, priorMatches);
  const defenseHome = shrinkRatio(blend(hAg, home.venueGoalsAgainst, leagueAway, home.venueSample), home.sample, priorMatches);

  return {
    home: clamp(leagueHome * attackHome * defenseAway, 0.15, 4.5),
    away: clamp(leagueAway * attackAway * defenseHome, 0.15, 4.5),
  };
}

function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 68) return "high";
  if (score >= 45) return "medium";
  return "low";
}

const pct = (v: number) => `${Math.round(v * 100)} %`;
const num = (v: number, d = 2) => v.toFixed(d).replace(".", ",");

export function analyzeMatch(input: AnalysisInput, settings: ModelSettings, now = new Date()): MatchAnalysis {
  const { match } = input;
  const window = settings.formWindow;
  const home = buildTeamProfile(match.homeTeam.id, input.homeRecords, "home", match.kickoff, window, settings.recencyHalfLife);
  const away = buildTeamProfile(match.awayTeam.id, input.awayRecords, "away", match.kickoff, window, settings.recencyHalfLife);

  const warnings: string[] = [];
  const leagueReliable = input.league.sample >= 20;
  const leagueHome = leagueReliable ? input.league.avgHomeGoals : DEFAULT_HOME_GOALS;
  const leagueAway = leagueReliable ? input.league.avgAwayGoals : DEFAULT_AWAY_GOALS;
  if (!leagueReliable) warnings.push("Moyennes du championnat peu fiables (échantillon réduit) : valeurs de référence génériques utilisées.");
  if (home.sample < 5 || away.sample < 5) warnings.push("Moins de 5 matchs récents pour au moins une équipe : estimations fragiles.");

  // --- Buts attendus -------------------------------------------------------
  const fromGoals = estimateLambdas(home, away, leagueHome, leagueAway, "goals", settings.priorMatches) ?? { home: leagueHome, away: leagueAway };
  const xgUsable = home.xgCoverage >= 0.6 && away.xgCoverage >= 0.6;
  const fromXg = xgUsable ? estimateLambdas(home, away, leagueHome, leagueAway, "xg", settings.priorMatches) : null;
  if (!xgUsable) warnings.push("xG indisponibles ou partiels : estimation basée uniquement sur les buts réels.");

  const b = fromXg ? settings.xgBlend : 0;
  const base = {
    home: fromGoals.home * (1 - b) + (fromXg?.home ?? 0) * b,
    away: fromGoals.away * (1 - b) + (fromXg?.away ?? 0) * b,
  };

  const { factors, edge, adjustmentEdge } = computeFactors(
    home,
    away,
    input.h2h,
    match.homeTeam.id,
    input.availability,
    settings,
  );
  const adjustment = Math.exp(settings.scoreInfluence * adjustmentEdge);
  const lambdaHome = clamp(base.home * adjustment, 0.15, 4.5);
  const lambdaAway = clamp(base.away / adjustment, 0.15, 4.5);

  const matrix = scoreMatrix(lambdaHome, lambdaAway, settings.dixonColesRho);
  const probs = goalMarketProbabilities(matrix);
  const probsGoals = goalMarketProbabilities(scoreMatrix(fromGoals.home, fromGoals.away, settings.dixonColesRho));
  const probsXg = fromXg ? goalMarketProbabilities(scoreMatrix(fromXg.home, fromXg.away, settings.dixonColesRho)) : null;

  // --- Corners -------------------------------------------------------------
  let expectedCorners: MatchAnalysis["expectedCorners"] = null;
  if (
    home.cornersFor !== null && home.cornersAgainst !== null && away.cornersFor !== null && away.cornersAgainst !== null
  ) {
    const ch = (home.cornersFor + away.cornersAgainst) / 2;
    const ca = (away.cornersFor + home.cornersAgainst) / 2;
    expectedCorners = { home: round(ch, 2), away: round(ca, 2), total: round(ch + ca, 2) };
  }

  // --- Qualité des données -------------------------------------------------
  const sampleScore = clamp(Math.min(home.sample, away.sample) / window, 0, 1);
  const statsCoverage = (home.summary.statsCoverage + away.summary.statsCoverage) / 2;
  const xgCoverage = Math.min(home.xgCoverage, away.xgCoverage);
  const availabilityKnown = input.availability.home !== null && input.availability.away !== null;
  const dqItems: DataQualityItem[] = [
    { label: "Historique récent", ok: sampleScore >= 0.8, detail: `${home.sample} / ${away.sample} matchs (fenêtre : ${window})` },
    { label: "Statistiques détaillées", ok: statsCoverage >= 0.8, detail: `Couverture ${pct(statsCoverage)}` },
    { label: "xG / xGA", ok: xgUsable, detail: xgUsable ? `Couverture ${pct(xgCoverage)}` : "Non disponibles ou partiels" },
    { label: "Moyennes du championnat", ok: leagueReliable, detail: `${input.league.sample} matchs` },
    { label: "Absences confirmées", ok: availabilityKnown, detail: availabilityKnown ? "Fournies par la source" : "Non fournies par la source" },
    { label: "Cotes", ok: input.odds !== null, detail: input.odds ? `${input.odds.bookmaker}${input.odds.isDemo ? " (démo)" : ""}` : "Aucune source de cotes" },
  ];
  const dqScore = Math.round(
    100 * (0.4 * sampleScore + 0.2 * statsCoverage + 0.2 * (xgUsable ? xgCoverage : 0) + 0.1 * (leagueReliable ? 1 : 0.4) + 0.1 * (availabilityKnown ? 1 : 0.5)),
  );

  // --- Marchés -------------------------------------------------------------
  const odds = input.odds?.markets ?? {};
  const markets: MarketEstimate[] = [];

  const makeConfidence = (p: number, pGoals: number | null, pXg: number | null, extraPenalty = 0, extraReason?: string): ConfidenceInfo => {
    const reasons: string[] = [];
    let score = dqScore;
    if (pGoals !== null && pXg !== null) {
      const disagreement = Math.abs(pGoals - pXg);
      score *= 1 - clamp(disagreement * 3, 0, 0.5);
      reasons.push(
        disagreement < 0.05
          ? "Modèles « buts » et « xG » concordants"
          : `Écart de ${Math.round(disagreement * 100)} pts entre modèles « buts » et « xG »`,
      );
    } else {
      score *= 0.9;
      reasons.push("Un seul modèle disponible (pas de xG) : pas de validation croisée");
    }
    if (sampleScore < 0.8) reasons.push("Historique récent incomplet");
    if (!availabilityKnown) reasons.push("Absences non connues");
    if (extraPenalty > 0) {
      score *= 1 - extraPenalty;
      if (extraReason) reasons.push(extraReason);
    }
    if (p > 0.9 || p < 0.05) reasons.push("Probabilité extrême : sensible aux événements rares");
    const s = Math.round(clamp(score, 0, 100));
    return { score: s, level: confidenceLevel(s), reasons };
  };

  const homeName = match.homeTeam.shortName;
  const awayName = match.awayTeam.shortName;
  const total = lambdaHome + lambdaAway;

  const explain = (key: MarketKey, p: number): string => {
    const lead = `Probabilité statistique estimée : ${pct(p)}.`;
    switch (MARKETS[key].group) {
      case "1X2":
      case "DOUBLE_CHANCE":
        return `${lead} Buts attendus ${homeName} ${num(lambdaHome)} – ${num(lambdaAway)} ${awayName}. Forme (5 derniers) : ${num(home.pointsPerMatchLast5)} vs ${num(away.pointsPerMatchLast5)} pts/match. Score analytique : ${Math.round(50 + 50 * edge)} / ${Math.round(50 - 50 * edge)}.`;
      case "GOALS":
        return `${lead} Total de buts attendu : ${num(total)} (${num(lambdaHome)} + ${num(lambdaAway)}). Sur leurs derniers matchs, ${pct(home.summary.over25Rate)} (${homeName}) et ${pct(away.summary.over25Rate)} (${awayName}) ont dépassé 2,5 buts.`;
      case "BTTS":
        return `${lead} ${homeName} a marqué dans ${pct(1 - home.summary.failedToScoreRate)} de ses matchs récents, ${awayName} dans ${pct(1 - away.summary.failedToScoreRate)}. Taux de BTTS : ${pct(home.summary.bttsRate)} et ${pct(away.summary.bttsRate)}.`;
      case "CORNERS":
        return `${lead} Corners attendus : ${num(expectedCorners?.total ?? 0, 1)} (loi binomiale négative, surdispersion prise en compte).`;
    }
  };

  const dataUsedFor = (key: MarketKey): string[] => {
    const base = [`${home.sample} + ${away.sample} matchs récents`, "Moyennes du championnat"];
    if (MARKETS[key].group === "CORNERS") return [...base, "Corners obtenus/concédés"];
    if (fromXg) base.push("xG / xGA");
    base.push("Buts marqués/encaissés (dom./ext.)");
    if (MARKETS[key].group === "1X2" || MARKETS[key].group === "DOUBLE_CHANCE") base.push("Score analytique (forme, repos, confrontations)");
    return base;
  };

  /**
   * Un écart très important avec le marché signale le plus souvent une
   * information absente du modèle (composition, blessure…) : la confiance
   * est réduite en conséquence.
   */
  const edgePenalty = (conf: ConfidenceInfo, edge: number | null): ConfidenceInfo => {
    if (edge === null || Math.abs(edge) <= 0.12) return conf;
    const score = Math.round(conf.score * (1 - clamp((Math.abs(edge) - 0.12) * 2.5, 0, 0.5)));
    return {
      score,
      level: confidenceLevel(score),
      reasons: [...conf.reasons, "Écart très élevé avec le marché : il intègre peut-être des informations absentes du modèle"],
    };
  };

  for (const key of GOAL_MARKET_KEYS) {
    const p = probs[key];
    const cmp = compareWithOdds(p, key, odds);
    markets.push({
      key,
      group: MARKETS[key].group,
      label: MARKETS[key].label,
      probability: round(p, 4),
      fairOdds: fairOdds(p),
      probabilityGoalsModel: round(probsGoals[key], 4),
      probabilityXgModel: probsXg ? round(probsXg[key], 4) : null,
      confidence: edgePenalty(makeConfidence(p, probsGoals[key], probsXg?.[key] ?? null), cmp?.edge ?? null),
      dataUsed: dataUsedFor(key),
      explanation: explain(key, p),
      odds: cmp?.odds ?? null,
      impliedProbability: cmp?.impliedProbability ?? null,
      fairImpliedProbability: cmp?.fairImpliedProbability ?? null,
      bookmakerMargin: cmp?.bookmakerMargin ?? null,
      edge: cmp?.edge ?? null,
      expectedValue: cmp?.expectedValue ?? null,
    });
  }

  if (expectedCorners) {
    for (const line of CORNER_LINES) {
      const over = negBinomialOver(line, expectedCorners.total, CORNERS_DISPERSION);
      for (const side of ["OVER", "UNDER"] as const) {
        const key = `CORNERS_${Math.floor(line)}_5_${side}` as MarketKey;
        const p = side === "OVER" ? over : 1 - over;
        const cmp = compareWithOdds(p, key, odds);
        markets.push({
          key,
          group: "CORNERS",
          label: MARKETS[key].label,
          probability: round(p, 4),
          fairOdds: fairOdds(p),
          probabilityGoalsModel: null,
          probabilityXgModel: null,
          confidence: edgePenalty(makeConfidence(p, null, null, 0.15, "Les corners sont très variables d'un match à l'autre"), cmp?.edge ?? null),
          dataUsed: dataUsedFor(key),
          explanation: explain(key, p),
          odds: cmp?.odds ?? null,
          impliedProbability: cmp?.impliedProbability ?? null,
          fairImpliedProbability: cmp?.fairImpliedProbability ?? null,
          bookmakerMargin: cmp?.bookmakerMargin ?? null,
          edge: cmp?.edge ?? null,
          expectedValue: cmp?.expectedValue ?? null,
        });
      }
    }
  } else {
    warnings.push("Données de corners insuffisantes : marchés corners non calculés.");
  }

  // --- Scores les plus probables --------------------------------------------
  const topScores: MatchAnalysis["topScores"] = [];
  matrix.forEach((row, h) => row.forEach((p, a) => topScores.push({ home: h, away: a, probability: p })));
  topScores.sort((x, y) => y.probability - x.probability);

  return {
    matchId: match.id,
    generatedAt: now.toISOString(),
    modelVersion: MODEL_VERSION,
    settings,
    expectedGoals: {
      home: round(lambdaHome, 3),
      away: round(lambdaAway, 3),
      total: round(total, 3),
      fromGoals: { home: round(fromGoals.home, 3), away: round(fromGoals.away, 3) },
      fromXg: fromXg ? { home: round(fromXg.home, 3), away: round(fromXg.away, 3) } : null,
      adjustment: round(adjustment, 4),
    },
    expectedCorners,
    scoreMatrix: matrix.map((row) => row.map((p) => round(p, 5))),
    topScores: topScores.slice(0, 6).map((s) => ({ ...s, probability: round(s.probability, 4) })),
    markets,
    factors,
    analyticalScore: { home: Math.round(50 + 50 * edge), away: Math.round(50 - 50 * edge), edge: round(edge, 4) },
    dataQuality: { score: dqScore, level: confidenceLevel(dqScore), items: dqItems },
    profiles: { home, away },
    context: buildContext(input, home, away),
    warnings,
    limitations: [
      "Modèle de Poisson (corrigé Dixon-Coles) : les buts sont supposés suivre une loi de Poisson autour des buts attendus.",
      "La force des adversaires rencontrés n'est pas explicitement corrigée.",
      "Les événements imprévisibles (cartons rouges, blessures en match, météo, rotation) ne sont pas modélisés.",
      "Une probabilité estimée n'est jamais une certitude : les performances passées ne garantissent pas les résultats futurs.",
    ],
  };
}

function standingFor(rows: StandingRow[] | undefined, teamId: string) {
  return rows?.find((r) => r.team.id === teamId) ?? null;
}

function buildContext(input: AnalysisInput, home: TeamProfile, away: TeamProfile): ContextItem[] {
  const { match } = input;
  const items: ContextItem[] = [];
  const hv = home.venueSummary;
  const av = away.venueSummary;

  items.push({
    key: "venue",
    label: "Domicile / extérieur",
    value: `${hv.wins}V ${hv.draws}N ${hv.losses}D à dom. · ${av.wins}V ${av.draws}N ${av.losses}D à l'ext.`,
    detail: `${match.homeTeam.shortName} à domicile : ${num(hv.goalsForPerMatch)} buts marqués et ${num(hv.goalsAgainstPerMatch)} encaissés par match. ${match.awayTeam.shortName} à l'extérieur : ${num(av.goalsForPerMatch)} / ${num(av.goalsAgainstPerMatch)}.`,
    available: hv.sample > 0 && av.sample > 0,
    tone: "neutral",
  });

  const fmtForm = (f: string[]) => f.map((r) => (r === "W" ? "V" : r === "D" ? "N" : "D")).join(" ") || "—";
  items.push({
    key: "form",
    label: "Forme récente",
    value: `${fmtForm(home.form)} · ${fmtForm(away.form)}`,
    detail: `Points par match sur 5 matchs : ${num(home.pointsPerMatchLast5)} (${match.homeTeam.shortName}) vs ${num(away.pointsPerMatchLast5)} (${match.awayTeam.shortName}).`,
    available: home.sample > 0 && away.sample > 0,
    tone: home.pointsPerMatchLast5 > away.pointsPerMatchLast5 + 0.4 ? "home" : away.pointsPerMatchLast5 > home.pointsPerMatchLast5 + 0.4 ? "away" : "neutral",
  });

  items.push({
    key: "schedule",
    label: "Calendrier & repos",
    value:
      home.restDays !== null && away.restDays !== null
        ? `${num(home.restDays, 1)} j vs ${num(away.restDays, 1)} j de repos`
        : "Non disponible",
    detail: `Matchs joués sur les 14 derniers jours : ${home.matchesLast14Days} (${match.homeTeam.shortName}) et ${away.matchesLast14Days} (${match.awayTeam.shortName}).`,
    available: home.restDays !== null && away.restDays !== null,
    tone:
      home.restDays !== null && away.restDays !== null && Math.abs(home.restDays - away.restDays) >= 2
        ? home.restDays > away.restDays
          ? "home"
          : "away"
        : "neutral",
  });

  const describeAbsences = (a: AnalysisInput["availability"]["home"], name: string) => {
    if (!a) return `${name} : aucune donnée fournie.`;
    if (a.absences.length === 0) return `${name} : aucune absence signalée par ${a.source}.`;
    return `${name} : ${a.absences.map((x) => `${x.player} (${x.status === "suspended" ? "suspendu" : x.status === "injured" ? "blessé" : x.status === "doubtful" ? "incertain" : "absent"}${x.confirmed ? "" : ", non confirmé"})`).join(", ")}.`;
  };
  const availabilityKnown = input.availability.home !== null || input.availability.away !== null;
  items.push({
    key: "availability",
    label: "Absences & suspensions",
    value: availabilityKnown ? "Données de la source" : "Aucune donnée disponible",
    detail: availabilityKnown
      ? `${describeAbsences(input.availability.home, match.homeTeam.shortName)} ${describeAbsences(input.availability.away, match.awayTeam.shortName)}`
      : "La source de données ne fournit pas d'absences pour ce match. Aucune blessure ni suspension n'est supposée ou inventée.",
    available: availabilityKnown,
    tone: availabilityKnown ? "neutral" : "warning",
  });

  const h2h = input.h2h;
  if (h2h.length > 0) {
    let w = 0;
    let l = 0;
    let goals = 0;
    for (const m of h2h) {
      const isHome = m.homeTeam.id === match.homeTeam.id;
      const gf = isHome ? m.score.home : m.score.away;
      const ga = isHome ? m.score.away : m.score.home;
      goals += gf + ga;
      if (gf > ga) w++;
      else if (gf < ga) l++;
    }
    items.push({
      key: "h2h",
      label: "Confrontations directes",
      value: `${w}V ${h2h.length - w - l}N ${l}D (${match.homeTeam.shortName})`,
      detail: `${h2h.length} confrontation(s) récente(s), ${num(goals / h2h.length)} buts par match en moyenne. Échantillon faible : poids limité dans le modèle.`,
      available: true,
      tone: "neutral",
    });
  } else {
    items.push({
      key: "h2h",
      label: "Confrontations directes",
      value: "Aucune confrontation récente",
      detail: "Aucun face-à-face disponible dans l'historique de la source.",
      available: false,
      tone: "neutral",
    });
  }

  const rows = input.standings?.rows;
  const sh = standingFor(rows, match.homeTeam.id);
  const sa = standingFor(rows, match.awayTeam.id);
  if (sh && sa && rows) {
    const teams = rows.length;
    const totalRounds = (teams - 1) * 2;
    const progress = Math.max(sh.played, sa.played) / totalRounds;
    let importance: string;
    let tone: ContextItem["tone"] = "neutral";
    if (progress < 0.25) {
      importance = "Début de saison : l'enjeu comptable n'est pas encore évaluable.";
    } else {
      const top = rows[0].points;
      const relegation = rows[Math.max(0, teams - 3)]?.points ?? 0;
      const near = (r: StandingRow) =>
        top - r.points <= 6 ? "course au titre" : r.points - relegation <= 4 ? "lutte pour le maintien" : null;
      const tags = [near(sh), near(sa)].filter(Boolean);
      importance = tags.length
        ? `Enjeu potentiellement élevé (${[...new Set(tags)].join(", ")}). Indicatif, basé sur le classement.`
        : "Pas d'enjeu comptable particulier identifié d'après le classement.";
      if (tags.length) tone = "warning";
    }
    items.push({
      key: "importance",
      label: "Importance du match",
      value: `${sh.position}ᵉ (${sh.points} pts) vs ${sa.position}ᵉ (${sa.points} pts)`,
      detail: importance,
      available: true,
      tone,
    });
  } else {
    items.push({
      key: "importance",
      label: "Importance du match",
      value: "Classement indisponible",
      detail: "Impossible d'évaluer l'enjeu sans classement.",
      available: false,
      tone: "neutral",
    });
  }

  return items;
}
