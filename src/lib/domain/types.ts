/**
 * Types de domaine partagés par les providers, le moteur d'analyse,
 * les services et l'interface. Aucun type ici ne dépend d'un fournisseur
 * de données particulier.
 */

export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "HALFTIME"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export type MatchResult = "W" | "D" | "L";
export type Side = "home" | "away";

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  country: Country;
  logo: string | null;
  type: "league" | "cup";
  season: string;
  /** true si la compétition provient du provider de démonstration. */
  isDemo: boolean;
}

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface Venue {
  name: string;
  city: string;
  capacity?: number | null;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  logo: string | null;
  colors: TeamColors;
  countryCode: string;
  venue: Venue | null;
}

export interface Score {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  competition: Competition;
  homeTeam: Team;
  awayTeam: Team;
  /** ISO 8601 (UTC). */
  kickoff: string;
  status: MatchStatus;
  minute: number | null;
  score: Score | null;
  halftimeScore: Score | null;
  venue: Venue | null;
  round: string | null;
  referee: string | null;
  isDemo: boolean;
}

/** Statistiques d'une équipe sur un match. Les champs null = non fournis. */
export interface TeamMatchStats {
  possession: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  yellowCards: number | null;
  redCards: number | null;
  fouls: number | null;
  xg: number | null;
  bigChances: number | null;
}

export interface TeamRef {
  id: string;
  name: string;
  shortName: string;
  code: string;
  logo: string | null;
  colors: TeamColors;
}

/** Un match passé vu depuis la perspective d'une équipe. */
export interface TeamMatchRecord {
  matchId: string;
  date: string;
  competitionId: string;
  competitionName: string;
  opponent: TeamRef;
  venue: Side;
  goalsFor: number;
  goalsAgainst: number;
  result: MatchResult;
  stats: TeamMatchStats | null;
  opponentStats: TeamMatchStats | null;
}

export interface HeadToHeadMatch {
  matchId: string;
  date: string;
  competitionName: string;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score: Score;
}

export interface StandingRow {
  position: number;
  team: TeamRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: MatchResult[];
}

export interface Standings {
  competitionId: string;
  season: string;
  rows: StandingRow[];
  updatedAt: string;
}

export const MARKET_KEYS = [
  "1X2_HOME",
  "1X2_DRAW",
  "1X2_AWAY",
  "DC_1X",
  "DC_X2",
  "DC_12",
  "OU_1_5_OVER",
  "OU_1_5_UNDER",
  "OU_2_5_OVER",
  "OU_2_5_UNDER",
  "OU_3_5_OVER",
  "OU_3_5_UNDER",
  "BTTS_YES",
  "BTTS_NO",
  "CORNERS_8_5_OVER",
  "CORNERS_8_5_UNDER",
  "CORNERS_9_5_OVER",
  "CORNERS_9_5_UNDER",
  "CORNERS_10_5_OVER",
  "CORNERS_10_5_UNDER",
] as const;

export type MarketKey = (typeof MARKET_KEYS)[number];

export type MarketGroup = "1X2" | "DOUBLE_CHANCE" | "GOALS" | "BTTS" | "CORNERS";

export interface OddsSnapshot {
  timestamp: string;
  odds: Partial<Record<MarketKey, number>>;
}

export interface MatchOdds {
  matchId: string;
  bookmaker: string;
  updatedAt: string;
  /** true si les cotes sont des cotes de démonstration générées. */
  isDemo: boolean;
  markets: Partial<Record<MarketKey, number>>;
  history: OddsSnapshot[];
}

export type AbsenceStatus = "injured" | "suspended" | "doubtful" | "other";

export interface PlayerAbsence {
  player: string;
  status: AbsenceStatus;
  reason: string | null;
  /** Information publiquement confirmée par la source. */
  confirmed: boolean;
}

export interface TeamAvailability {
  teamId: string;
  source: string;
  updatedAt: string;
  absences: PlayerAbsence[];
}

export interface MatchAvailability {
  home: TeamAvailability | null;
  away: TeamAvailability | null;
}

export type MatchEventType =
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "yellow"
  | "red"
  | "substitution"
  | "var";

export interface MatchEvent {
  id: string;
  minute: number;
  type: MatchEventType;
  side: Side;
  player: string | null;
  detail: string | null;
}

export interface LiveSnapshot {
  matchId: string;
  status: MatchStatus;
  minute: number | null;
  score: Score | null;
  events: MatchEvent[];
  stats: { home: TeamMatchStats; away: TeamMatchStats } | null;
  odds: Partial<Record<MarketKey, number>> | null;
  updatedAt: string;
  isDemo: boolean;
}

export interface ProviderCapabilities {
  odds: boolean;
  xg: boolean;
  corners: boolean;
  availability: boolean;
  live: boolean;
  standings: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  isDemo: boolean;
  capabilities: ProviderCapabilities;
}

/** Statistiques agrégées d'une équipe sur un échantillon de matchs. */
export interface TeamStatsSummary {
  teamId: string;
  sample: number;
  wins: number;
  draws: number;
  losses: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  /** Moyennes : null si la donnée n'est pas fournie par la source. */
  possession: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  cornersAgainst: number | null;
  cards: number | null;
  xg: number | null;
  xga: number | null;
  bigChances: number | null;
  cleanSheetRate: number;
  failedToScoreRate: number;
  bttsRate: number;
  over15Rate: number;
  over25Rate: number;
  over35Rate: number;
  pointsPerMatch: number;
  /** Couverture des statistiques détaillées (0-1). */
  statsCoverage: number;
  xgCoverage: number;
}
