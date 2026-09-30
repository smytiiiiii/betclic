/**
 * Objets de transfert (serveur → interface). Fichier sans dépendance
 * serveur : importable par les composants client.
 */
import type { MatchAnalysis } from "@/lib/engine/types";
import type {
  HeadToHeadMatch,
  MarketKey,
  Match,
  MatchAvailability,
  MatchOdds,
  MatchResult,
  ProviderInfo,
  Standings,
  TeamMatchRecord,
} from "@/lib/domain/types";

export interface MatchCardDTO {
  match: Match;
  homeForm: MatchResult[];
  awayForm: MatchResult[];
  homePosition: number | null;
  awayPosition: number | null;
  odds1x2: { home: number | null; draw: number | null; away: number | null } | null;
  oddsIsDemo: boolean;
  probabilities: { home: number; draw: number; away: number; over25: number; btts: number } | null;
  expectedGoals: { home: number; away: number } | null;
  bestEdge: { key: MarketKey; label: string; edge: number; odds: number; probability: number } | null;
  dataQuality: number | null;
  /** Nombre de probabilités de marché calculées. */
  marketCount: number;
}

export interface MatchDetailDTO {
  match: Match;
  analysis: MatchAnalysis | null;
  analysisError: string | null;
  homeRecords: TeamMatchRecord[];
  awayRecords: TeamMatchRecord[];
  h2h: HeadToHeadMatch[];
  odds: MatchOdds | null;
  standings: Standings | null;
  availability: MatchAvailability;
  provider: ProviderInfo;
}

export interface OpportunityDTO {
  id: string;
  match: Pick<Match, "id" | "kickoff" | "status" | "competition" | "homeTeam" | "awayTeam" | "isDemo">;
  marketKey: MarketKey;
  marketLabel: string;
  group: string;
  odds: number;
  probability: number;
  impliedProbability: number;
  fairImpliedProbability: number | null;
  edge: number;
  expectedValue: number;
  confidence: number;
  confidenceLevel: "low" | "medium" | "high";
  explanation: string;
  oddsIsDemo: boolean;
  bookmaker: string;
}

export interface BacktestRecord {
  id: string;
  date: string;
  matchId: string;
  matchLabel: string;
  competition: string;
  marketKey: MarketKey;
  marketLabel: string;
  odds: number;
  probability: number;
  impliedProbability: number;
  edge: number;
  confidence: number;
  won: boolean;
  /** Profit pour une mise d'une unité. */
  profit: number;
  score: string;
}

export interface BacktestSummary {
  isDemo: boolean;
  from: string;
  to: string;
  matchesEvaluated: number;
  probabilitiesComputed: number;
  model: { brier: number; logLoss: number; accuracy: number };
  market: { brier: number; logLoss: number; accuracy: number } | null;
  valuePicks: { count: number; won: number; hitRate: number; staked: number; profit: number; roi: number };
  calibration: { label: string; predicted: number; observed: number; count: number }[];
  series: { date: string; profit: number; cumulative: number; picks: number }[];
  byGroup: { group: string; count: number; hitRate: number; roi: number }[];
  records: BacktestRecord[];
  settingsMinEdge: number;
}
