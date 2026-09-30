import type {
  Competition,
  HeadToHeadMatch,
  LiveSnapshot,
  Match,
  MatchAvailability,
  MatchOdds,
  MatchStatus,
  ProviderInfo,
  Standings,
  Team,
  TeamMatchRecord,
  TeamStatsSummary,
} from "@/lib/domain/types";

export interface MatchQuery {
  /** Bornes ISO incluses. */
  from?: string;
  to?: string;
  competitionId?: string;
  countryCode?: string;
  teamId?: string;
  status?: MatchStatus[];
  limit?: number;
}

export interface HistoryOptions {
  /** Seuls les matchs strictement antérieurs à cette date sont renvoyés. */
  before?: string;
  limit?: number;
}

/**
 * Abstraction d'une source de données football.
 *
 * Toute l'application (services, moteur, API) dépend uniquement de cette
 * interface : pour brancher un nouveau fournisseur, il suffit de
 * l'implémenter et de l'enregistrer dans `providers/index.ts`.
 */
export interface SportDataProvider {
  readonly info: ProviderInfo;

  getCompetitions(): Promise<Competition[]>;
  getMatches(query: MatchQuery): Promise<Match[]>;
  getMatch(id: string): Promise<Match | null>;
  getTeam(id: string): Promise<Team | null>;
  getTeams(): Promise<Team[]>;

  /** Derniers matchs terminés de l'équipe, du plus récent au plus ancien. */
  getTeamForm(teamId: string, options?: HistoryOptions): Promise<TeamMatchRecord[]>;
  /**
   * Statistiques agrégées de l'équipe. Par défaut, calculées à partir de
   * `getTeamForm` (voir `engine/team-stats.ts`) ; un provider peut
   * renvoyer des statistiques de saison natives.
   */
  getTeamStats(teamId: string, options?: HistoryOptions): Promise<TeamStatsSummary>;
  getHeadToHead(teamAId: string, teamBId: string, options?: HistoryOptions): Promise<HeadToHeadMatch[]>;
  getStandings(competitionId: string): Promise<Standings | null>;
  /** Cotes d'une source légale. `null` si aucune source n'est disponible. */
  getOdds(matchId: string): Promise<MatchOdds | null>;
  /** Absences publiquement confirmées. `null` par équipe si non fourni. */
  getAvailability(matchId: string): Promise<MatchAvailability>;
  /** Instantané temps réel (score, minute, événements, stats live). */
  getLiveSnapshot(matchId: string): Promise<LiveSnapshot | null>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
