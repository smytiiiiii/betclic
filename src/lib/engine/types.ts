import type { FactorKey, ModelSettings } from "@/lib/domain/settings";
import type {
  HeadToHeadMatch,
  MarketGroup,
  MarketKey,
  Match,
  MatchAvailability,
  MatchOdds,
  MatchResult,
  Standings,
  TeamMatchRecord,
  TeamStatsSummary,
} from "@/lib/domain/types";

export const MODEL_VERSION = "kairos-poisson-dc-1.0";

export interface LeagueContext {
  avgHomeGoals: number;
  avgAwayGoals: number;
  avgTotalCorners: number | null;
  /** Nombre de matchs ayant servi au calcul des moyennes. */
  sample: number;
}

export interface AnalysisInput {
  match: Pick<Match, "id" | "kickoff" | "homeTeam" | "awayTeam" | "competition">;
  /** Matchs terminés AVANT le coup d'envoi, du plus récent au plus ancien. */
  homeRecords: TeamMatchRecord[];
  awayRecords: TeamMatchRecord[];
  h2h: HeadToHeadMatch[];
  odds: MatchOdds | null;
  availability: MatchAvailability;
  league: LeagueContext;
  standings: Standings | null;
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface ConfidenceInfo {
  /** 0-100 : fiabilité statistique de l'estimation, pas la chance de succès. */
  score: number;
  level: ConfidenceLevel;
  reasons: string[];
}

export interface TeamProfile {
  teamId: string;
  sample: number;
  venue: "home" | "away";
  venueSample: number;
  goalsFor: number;
  goalsAgainst: number;
  venueGoalsFor: number | null;
  venueGoalsAgainst: number | null;
  xgFor: number | null;
  xgAgainst: number | null;
  xgCoverage: number;
  cornersFor: number | null;
  cornersAgainst: number | null;
  pointsPerMatchLast5: number;
  venuePointsPerMatch: number | null;
  form: MatchResult[];
  restDays: number | null;
  matchesLast14Days: number;
  summary: TeamStatsSummary;
  venueSummary: TeamStatsSummary;
}

export interface FactorContribution {
  key: FactorKey;
  label: string;
  /** Pondération configurée (non normalisée). */
  weight: number;
  /** Pondération après redistribution sur les facteurs disponibles (0-1). */
  normalizedWeight: number;
  available: boolean;
  /** Valeur du facteur entre -1 (favorise l'extérieur) et +1 (favorise le domicile). */
  value: number;
  /** Contribution signée au score composite. */
  contribution: number;
  homeDisplay: string;
  awayDisplay: string;
  detail: string;
  /** true si le facteur ajuste les buts attendus (non déjà capturé par le modèle de buts). */
  adjustsExpectedGoals: boolean;
}

export interface MarketEstimate {
  key: MarketKey;
  group: MarketGroup;
  label: string;
  probability: number;
  fairOdds: number;
  /** Probabilité selon le seul modèle « buts réels » et le seul modèle « xG ». */
  probabilityGoalsModel: number | null;
  probabilityXgModel: number | null;
  confidence: ConfidenceInfo;
  dataUsed: string[];
  explanation: string;
  odds: number | null;
  impliedProbability: number | null;
  /** Probabilité implicite après retrait de la marge du bookmaker. */
  fairImpliedProbability: number | null;
  bookmakerMargin: number | null;
  /** Écart = probabilité modèle - probabilité implicite (fraction, ex. 0.1 = +10 pts). */
  edge: number | null;
  /** Espérance mathématique théorique d'une mise unitaire (p × cote - 1). */
  expectedValue: number | null;
}

export interface ContextItem {
  key: string;
  label: string;
  value: string;
  detail: string;
  available: boolean;
  tone: "neutral" | "home" | "away" | "warning";
}

export interface DataQualityItem {
  label: string;
  ok: boolean;
  detail: string;
}

export interface MatchAnalysis {
  matchId: string;
  generatedAt: string;
  modelVersion: string;
  settings: ModelSettings;
  expectedGoals: {
    home: number;
    away: number;
    total: number;
    fromGoals: { home: number; away: number };
    fromXg: { home: number; away: number } | null;
    /** Multiplicateur appliqué aux buts attendus domicile par le score analytique. */
    adjustment: number;
  };
  expectedCorners: { home: number; away: number; total: number } | null;
  scoreMatrix: number[][];
  topScores: { home: number; away: number; probability: number }[];
  markets: MarketEstimate[];
  factors: FactorContribution[];
  analyticalScore: { home: number; away: number; edge: number };
  dataQuality: { score: number; level: ConfidenceLevel; items: DataQualityItem[] };
  profiles: { home: TeamProfile; away: TeamProfile };
  context: ContextItem[];
  warnings: string[];
  limitations: string[];
}
