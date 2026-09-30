import "server-only";
import type {
  Competition,
  HeadToHeadMatch,
  LiveSnapshot,
  MarketKey,
  Match,
  MatchAvailability,
  MatchEvent,
  MatchOdds,
  MatchStatus,
  PlayerAbsence,
  Standings,
  Team,
  TeamMatchRecord,
  TeamMatchStats,
  TeamRef,
  TeamStatsSummary,
} from "@/lib/domain/types";
import { summarizeTeamRecords } from "@/lib/engine/team-stats";
import { ProviderError, type HistoryOptions, type MatchQuery, type SportDataProvider } from "../types";
import type {
  AfEvent,
  AfFixture,
  AfInjury,
  AfLeague,
  AfOddsResponse,
  AfStandingsResponse,
  AfStatisticsBlock,
  AfTeamResponse,
} from "./types";

export interface ApiFootballConfig {
  apiKey: string;
  baseUrl: string;
  leagues: number[];
  season: number;
  bookmakerId?: number;
  cacheSeconds: number;
}

const STATUS_MAP: Record<string, MatchStatus> = {
  TBD: "SCHEDULED",
  NS: "SCHEDULED",
  "1H": "LIVE",
  HT: "HALFTIME",
  "2H": "LIVE",
  ET: "LIVE",
  BT: "LIVE",
  P: "LIVE",
  LIVE: "LIVE",
  INT: "LIVE",
  SUSP: "POSTPONED",
  PST: "POSTPONED",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  AWD: "FINISHED",
  WO: "FINISHED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
};

const FINISHED = "FT-AET-PEN";
const DEFAULT_COLORS = { primary: "#334155", secondary: "#e2e8f0" };

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Limiteur de concurrence minimal (évite de saturer le quota de l'API). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Adaptateur API-Football v3 (api-sports.io).
 *
 * Documentation : https://www.api-football.com/documentation-v3
 * La clé API n'est utilisée que côté serveur (en-tête x-apisports-key).
 * Vérifiez les conditions de licence de votre abonnement, notamment pour
 * l'affichage des cotes.
 */
export class ApiFootballProvider implements SportDataProvider {
  readonly info = {
    id: "api-football",
    name: "API-Football",
    isDemo: false,
    capabilities: { odds: true, xg: true, corners: true, availability: true, live: true, standings: true },
  };

  private readonly memo = new Map<string, { expires: number; value: Promise<unknown> }>();

  constructor(private readonly config: ApiFootballConfig) {
    if (!config.apiKey) throw new ProviderError("SPORTS_API_KEY manquante pour API-Football", 500);
    if (!config.leagues.length) throw new ProviderError("SPORTS_API_LEAGUES doit lister au moins un identifiant de ligue", 500);
  }

  // --- HTTP ----------------------------------------------------------------

  private async request<T>(path: string, params: Record<string, string | number | undefined>, ttl = this.config.cacheSeconds): Promise<T[]> {
    const url = new URL(path.replace(/^\//, ""), this.config.baseUrl.endsWith("/") ? this.config.baseUrl : `${this.config.baseUrl}/`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
    const key = url.toString();
    const hit = this.memo.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as Promise<T[]>;

    const promise = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const res = await fetch(key, {
          headers: { "x-apisports-key": this.config.apiKey, accept: "application/json" },
          signal: controller.signal,
          next: { revalidate: ttl },
        });
        if (res.status === 429) throw new ProviderError("Quota de l'API sportive atteint (429)", 429);
        if (!res.ok) throw new ProviderError(`API sportive : HTTP ${res.status}`, res.status >= 500 ? 502 : res.status);
        const body = (await res.json()) as { response?: T[]; errors?: unknown };
        const errors = body.errors;
        const hasErrors = Array.isArray(errors) ? errors.length > 0 : errors && typeof errors === "object" && Object.keys(errors).length > 0;
        if (hasErrors) throw new ProviderError(`API sportive : ${JSON.stringify(errors)}`, 502);
        return body.response ?? [];
      } catch (err) {
        this.memo.delete(key);
        if (err instanceof ProviderError) throw err;
        throw new ProviderError("API sportive injoignable", 502, err);
      } finally {
        clearTimeout(timeout);
      }
    })();
    this.memo.set(key, { expires: Date.now() + ttl * 1000, value: promise });
    return promise;
  }

  // --- Mapping -------------------------------------------------------------

  private competitionFrom(league: AfLeague["league"] & { country?: string; flag?: string | null; season?: number }): Competition {
    return {
      id: String(league.id),
      name: league.name,
      shortName: league.name,
      country: { code: league.country ?? "", name: league.country ?? "", flag: "" },
      logo: league.logo ?? null,
      type: league.type === "Cup" ? "cup" : "league",
      season: String(league.season ?? this.config.season),
      isDemo: false,
    };
  }

  private teamRef(t: { id: number; name: string; logo?: string | null }): TeamRef {
    return {
      id: String(t.id),
      name: t.name,
      shortName: t.name,
      code: t.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(),
      logo: t.logo ?? null,
      colors: DEFAULT_COLORS,
    };
  }

  private teamFrom(t: { id: number; name: string; logo?: string | null }, venue?: Match["venue"]): Team {
    return { ...this.teamRef(t), countryCode: "", venue: venue ?? null };
  }

  private matchFrom(f: AfFixture): Match {
    const status = STATUS_MAP[f.fixture.status.short] ?? "SCHEDULED";
    const hasScore = f.goals.home !== null && f.goals.away !== null;
    const venue = f.fixture.venue?.name ? { name: f.fixture.venue.name, city: f.fixture.venue.city ?? "" } : null;
    return {
      id: String(f.fixture.id),
      competition: this.competitionFrom({ ...f.league, type: "League" }),
      homeTeam: this.teamFrom(f.teams.home),
      awayTeam: this.teamFrom(f.teams.away),
      kickoff: new Date(f.fixture.timestamp * 1000).toISOString(),
      status,
      minute: status === "LIVE" || status === "HALFTIME" ? f.fixture.status.elapsed : null,
      score: hasScore ? { home: f.goals.home!, away: f.goals.away! } : null,
      halftimeScore:
        f.score?.halftime?.home !== null && f.score?.halftime?.home !== undefined
          ? { home: f.score.halftime.home, away: f.score.halftime.away ?? 0 }
          : null,
      venue,
      round: f.league.round ?? null,
      referee: f.fixture.referee ?? null,
      isDemo: false,
    };
  }

  private statsFrom(block: AfStatisticsBlock | undefined): TeamMatchStats | null {
    if (!block) return null;
    const get = (type: string): number | null => {
      const v = block.statistics.find((s) => s.type === type)?.value;
      if (v === null || v === undefined) return null;
      const n = typeof v === "number" ? v : parseFloat(String(v).replace("%", ""));
      return Number.isFinite(n) ? n : null;
    };
    return {
      possession: get("Ball Possession"),
      shots: get("Total Shots"),
      shotsOnTarget: get("Shots on Goal"),
      corners: get("Corner Kicks"),
      yellowCards: get("Yellow Cards") ?? 0,
      redCards: get("Red Cards") ?? 0,
      fouls: get("Fouls"),
      xg: get("expected_goals"),
      bigChances: null,
    };
  }

  private async fixtureStats(fixtureId: number): Promise<AfStatisticsBlock[]> {
    // Les statistiques d'un match terminé ne changent plus : cache long.
    return this.request<AfStatisticsBlock>("fixtures/statistics", { fixture: fixtureId }, 86_400);
  }

  // --- SportDataProvider ---------------------------------------------------

  async getCompetitions(): Promise<Competition[]> {
    const lists = await mapLimit(this.config.leagues, 3, (id) =>
      this.request<AfLeague>("leagues", { id, season: this.config.season }, 86_400),
    );
    return lists.flat().map((l) => this.competitionFrom({ ...l.league, country: l.country?.name, season: this.config.season }));
  }

  async getMatches(query: MatchQuery): Promise<Match[]> {
    const from = query.from ? isoDate(new Date(query.from)) : isoDate(new Date());
    const to = query.to ? isoDate(new Date(query.to)) : from;
    const leagues = query.competitionId ? [Number(query.competitionId)] : this.config.leagues;
    const lists = await mapLimit(leagues, 3, (league) =>
      this.request<AfFixture>("fixtures", {
        league,
        season: this.config.season,
        from,
        to,
        team: query.teamId,
        timezone: "UTC",
      }, 60),
    );
    let matches = lists.flat().map((f) => this.matchFrom(f));
    const fromTs = query.from ? new Date(query.from).getTime() : -Infinity;
    const toTs = query.to ? new Date(query.to).getTime() : Infinity;
    matches = matches.filter((m) => {
      const t = new Date(m.kickoff).getTime();
      return t >= fromTs && t <= toTs;
    });
    if (query.status?.length) matches = matches.filter((m) => query.status!.includes(m.status));
    matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    return query.limit ? matches.slice(0, query.limit) : matches;
  }

  async getMatch(id: string): Promise<Match | null> {
    const [f] = await this.request<AfFixture>("fixtures", { id }, 30);
    return f ? this.matchFrom(f) : null;
  }

  async getTeam(id: string): Promise<Team | null> {
    const [t] = await this.request<AfTeamResponse>("teams", { id }, 86_400);
    if (!t) return null;
    return this.teamFrom(t.team, t.venue?.name ? { name: t.venue.name, city: t.venue.city ?? "", capacity: t.venue.capacity } : null);
  }

  async getTeams(): Promise<Team[]> {
    const lists = await mapLimit(this.config.leagues, 3, (league) =>
      this.request<AfTeamResponse>("teams", { league, season: this.config.season }, 86_400),
    );
    return lists.flat().map((t) => this.teamFrom(t.team, t.venue?.name ? { name: t.venue.name, city: t.venue.city ?? "" } : null));
  }

  async getTeamForm(teamId: string, options: HistoryOptions = {}): Promise<TeamMatchRecord[]> {
    const before = options.before ? new Date(options.before) : new Date();
    const to = new Date(before.getTime() - 86_400_000);
    const fixtures = await this.request<AfFixture>("fixtures", {
      team: teamId,
      season: this.config.season,
      status: FINISHED,
      from: `${this.config.season}-07-01`,
      to: isoDate(to),
      timezone: "UTC",
    });
    const recent = fixtures
      .filter((f) => f.fixture.timestamp * 1000 < before.getTime())
      .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
      .slice(0, options.limit ?? 10);

    return mapLimit(recent, 4, async (f): Promise<TeamMatchRecord> => {
      const isHome = String(f.teams.home.id) === teamId;
      const gf = (isHome ? f.goals.home : f.goals.away) ?? 0;
      const ga = (isHome ? f.goals.away : f.goals.home) ?? 0;
      let stats: TeamMatchStats | null = null;
      let opponentStats: TeamMatchStats | null = null;
      try {
        const blocks = await this.fixtureStats(f.fixture.id);
        stats = this.statsFrom(blocks.find((b) => String(b.team.id) === teamId));
        opponentStats = this.statsFrom(blocks.find((b) => String(b.team.id) !== teamId));
      } catch {
        // Statistiques détaillées optionnelles : le moteur sait s'en passer.
      }
      return {
        matchId: String(f.fixture.id),
        date: new Date(f.fixture.timestamp * 1000).toISOString(),
        competitionId: String(f.league.id),
        competitionName: f.league.name,
        opponent: this.teamRef(isHome ? f.teams.away : f.teams.home),
        venue: isHome ? "home" : "away",
        goalsFor: gf,
        goalsAgainst: ga,
        result: gf > ga ? "W" : gf === ga ? "D" : "L",
        stats,
        opponentStats,
      };
    });
  }

  async getTeamStats(teamId: string, options: HistoryOptions = {}): Promise<TeamStatsSummary> {
    const records = await this.getTeamForm(teamId, { ...options, limit: options.limit ?? 10 });
    return summarizeTeamRecords(teamId, records);
  }

  async getHeadToHead(teamAId: string, teamBId: string, options: HistoryOptions = {}): Promise<HeadToHeadMatch[]> {
    const fixtures = await this.request<AfFixture>("fixtures/headtohead", {
      h2h: `${teamAId}-${teamBId}`,
      last: 10,
      status: FINISHED,
    }, 86_400);
    const beforeTs = options.before ? new Date(options.before).getTime() : Date.now();
    return fixtures
      .filter((f) => f.fixture.timestamp * 1000 < beforeTs && f.goals.home !== null)
      .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
      .slice(0, options.limit ?? 6)
      .map((f) => ({
        matchId: String(f.fixture.id),
        date: new Date(f.fixture.timestamp * 1000).toISOString(),
        competitionName: f.league.name,
        homeTeam: this.teamRef(f.teams.home),
        awayTeam: this.teamRef(f.teams.away),
        score: { home: f.goals.home ?? 0, away: f.goals.away ?? 0 },
      }));
  }

  async getStandings(competitionId: string): Promise<Standings | null> {
    const [resp] = await this.request<AfStandingsResponse>("standings", { league: competitionId, season: this.config.season }, 3_600);
    const table = resp?.league.standings?.[0];
    if (!table) return null;
    return {
      competitionId,
      season: String(this.config.season),
      updatedAt: new Date().toISOString(),
      rows: table.map((r) => ({
        position: r.rank,
        team: this.teamRef(r.team),
        played: r.all.played,
        won: r.all.win,
        drawn: r.all.draw,
        lost: r.all.lose,
        goalsFor: r.all.goals.for,
        goalsAgainst: r.all.goals.against,
        points: r.points,
        form: (r.form ?? "").split("").filter((c) => c === "W" || c === "D" || c === "L").slice(-5).reverse() as ("W" | "D" | "L")[],
      })),
    };
  }

  async getOdds(matchId: string): Promise<MatchOdds | null> {
    const [resp] = await this.request<AfOddsResponse>("odds", { fixture: matchId, bookmaker: this.config.bookmakerId }, 600);
    const bookmaker = resp?.bookmakers?.[0];
    if (!bookmaker) return null;
    const markets: Partial<Record<MarketKey, number>> = {};
    const setOdd = (key: MarketKey, v: string | undefined) => {
      const n = v ? parseFloat(v) : NaN;
      if (Number.isFinite(n) && n > 1) markets[key] = n;
    };
    for (const bet of bookmaker.bets) {
      const val = (name: string) => bet.values.find((v) => v.value === name)?.odd;
      switch (bet.name) {
        case "Match Winner":
          setOdd("1X2_HOME", val("Home"));
          setOdd("1X2_DRAW", val("Draw"));
          setOdd("1X2_AWAY", val("Away"));
          break;
        case "Double Chance":
          setOdd("DC_1X", val("Home/Draw"));
          setOdd("DC_X2", val("Draw/Away"));
          setOdd("DC_12", val("Home/Away"));
          break;
        case "Goals Over/Under":
          for (const line of ["1.5", "2.5", "3.5"]) {
            const k = line.replace(".", "_");
            setOdd(`OU_${k}_OVER` as MarketKey, val(`Over ${line}`));
            setOdd(`OU_${k}_UNDER` as MarketKey, val(`Under ${line}`));
          }
          break;
        case "Both Teams Score":
          setOdd("BTTS_YES", val("Yes"));
          setOdd("BTTS_NO", val("No"));
          break;
        case "Corners Over Under":
          for (const line of ["8.5", "9.5", "10.5"]) {
            const k = line.replace(".", "_");
            setOdd(`CORNERS_${k}_OVER` as MarketKey, val(`Over ${line}`));
            setOdd(`CORNERS_${k}_UNDER` as MarketKey, val(`Under ${line}`));
          }
          break;
      }
    }
    const updatedAt = resp.update ?? new Date().toISOString();
    return {
      matchId,
      bookmaker: bookmaker.name,
      updatedAt,
      isDemo: false,
      markets,
      history: [{ timestamp: updatedAt, odds: markets }],
    };
  }

  async getAvailability(matchId: string): Promise<MatchAvailability> {
    const [match, injuries] = await Promise.all([
      this.getMatch(matchId),
      this.request<AfInjury>("injuries", { fixture: matchId }, 1_800).catch(() => null),
    ]);
    if (!match || injuries === null) return { home: null, away: null };
    const build = (teamId: string) => {
      const absences: PlayerAbsence[] = injuries
        .filter((i) => String(i.team.id) === teamId)
        .map((i) => ({
          player: i.player.name,
          status: /suspen/i.test(i.player.reason ?? "") ? "suspended" : i.player.type === "Questionable" ? "doubtful" : "injured",
          reason: i.player.reason ?? null,
          confirmed: i.player.type === "Missing Fixture",
        }));
      return { teamId, source: "API-Football", updatedAt: new Date().toISOString(), absences };
    };
    return { home: build(match.homeTeam.id), away: build(match.awayTeam.id) };
  }

  async getLiveSnapshot(matchId: string): Promise<LiveSnapshot | null> {
    const [f] = await this.request<AfFixture & { events?: AfEvent[]; statistics?: AfStatisticsBlock[] }>("fixtures", { id: matchId }, 15);
    if (!f) return null;
    const match = this.matchFrom(f);
    const homeId = f.teams.home.id;
    const events: MatchEvent[] = (f.events ?? []).map((e, i) => {
      const side = e.team.id === homeId ? "home" : "away";
      let type: MatchEvent["type"] = "var";
      if (e.type === "Goal") type = e.detail === "Own Goal" ? "own_goal" : e.detail === "Penalty" ? "penalty_goal" : "goal";
      else if (e.type === "Card") type = /red/i.test(e.detail ?? "") ? "red" : "yellow";
      else if (e.type === "subst") type = "substitution";
      return {
        id: `${matchId}-${i}`,
        minute: e.time.elapsed + (e.time.extra ?? 0),
        type,
        side,
        player: e.player?.name ?? null,
        detail: e.detail ?? null,
      };
    });
    const stats = f.statistics?.length
      ? {
          home: this.statsFrom(f.statistics.find((s) => s.team.id === homeId)) ?? this.statsFrom(undefined)!,
          away: this.statsFrom(f.statistics.find((s) => s.team.id !== homeId)) ?? this.statsFrom(undefined)!,
        }
      : null;
    return {
      matchId,
      status: match.status,
      minute: match.minute,
      score: match.score,
      events,
      stats: stats && stats.home && stats.away ? stats : null,
      odds: null,
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
  }
}
