import type {
  Competition,
  HeadToHeadMatch,
  LiveSnapshot,
  Match,
  MatchAvailability,
  MatchOdds,
  StandingRow,
  Standings,
  Team,
  TeamMatchRecord,
  TeamMatchStats,
  TeamRef,
  TeamStatsSummary,
} from "@/lib/domain/types";
import { summarizeTeamRecords } from "@/lib/engine/team-stats";
import type { HistoryOptions, MatchQuery, SportDataProvider } from "../types";
import {
  demoLiveOdds,
  demoOddsHistory,
  fixtureState,
  getDemoWorld,
  type Fixture,
} from "./world";

const toRef = (t: Team): TeamRef => ({
  id: t.id,
  name: t.name,
  shortName: t.shortName,
  code: t.code,
  logo: t.logo,
  colors: t.colors,
});

function scaleStats(s: TeamMatchStats, ratio: number): TeamMatchStats {
  const sc = (v: number | null) => (v === null ? null : Math.round(v * ratio));
  return {
    ...s,
    shots: sc(s.shots),
    shotsOnTarget: sc(s.shotsOnTarget),
    corners: sc(s.corners),
    fouls: sc(s.fouls),
    bigChances: sc(s.bigChances),
    xg: s.xg === null ? null : Math.round(s.xg * ratio * 100) / 100,
  };
}

/**
 * Provider de DÉMONSTRATION : données entièrement fictives et générées.
 * Utilisé automatiquement quand aucune API sportive n'est configurée.
 */
export class MockSportDataProvider implements SportDataProvider {
  readonly info = {
    id: "demo",
    name: "Données de démonstration",
    isDemo: true,
    capabilities: {
      odds: true,
      xg: true,
      corners: true,
      // Le provider de démo ne fournit volontairement AUCUNE absence :
      // on ne génère jamais de fausses blessures.
      availability: false,
      live: true,
      standings: true,
    },
  };

  constructor(private readonly clock: () => number = () => Date.now()) {}

  private world() {
    return getDemoWorld(this.clock());
  }

  private toMatch(f: Fixture): Match {
    const now = this.clock();
    const state = fixtureState(f, now);
    let score: Match["score"] = null;
    let halftimeScore: Match["halftimeScore"] = null;
    if (f.result && (state.status === "LIVE" || state.status === "HALFTIME")) {
      const minute = state.minute ?? 0;
      const goals = (side: "home" | "away") =>
        f.result!.events.filter((e) => e.side === side && (e.type === "goal" || e.type === "penalty_goal") && e.minute <= minute).length;
      score = { home: goals("home"), away: goals("away") };
      if (state.status === "HALFTIME" || minute > 45) halftimeScore = { home: f.result.htHome, away: f.result.htAway };
    } else if (f.result && state.status === "FINISHED") {
      score = { home: f.result.home, away: f.result.away };
      halftimeScore = { home: f.result.htHome, away: f.result.htAway };
    }
    return {
      id: f.id,
      competition: f.competition,
      homeTeam: f.home,
      awayTeam: f.away,
      kickoff: new Date(f.kickoffTs).toISOString(),
      status: state.status,
      minute: state.status === "LIVE" || state.status === "HALFTIME" ? state.minute : null,
      score,
      halftimeScore,
      venue: f.home.venue,
      round: `Journée ${f.roundInSeason + 1}`,
      referee: null,
      isDemo: true,
    };
  }

  private isFinished(f: Fixture, beforeTs: number) {
    return f.result !== null && fixtureState(f, this.clock()).status === "FINISHED" && f.kickoffTs < beforeTs;
  }

  async getCompetitions(): Promise<Competition[]> {
    return this.world().competitions;
  }

  async getMatches(query: MatchQuery): Promise<Match[]> {
    const w = this.world();
    const from = query.from ? new Date(query.from).getTime() : -Infinity;
    const to = query.to ? new Date(query.to).getTime() : Infinity;
    let list = query.competitionId ? (w.byCompetition.get(query.competitionId) ?? []) : query.teamId ? (w.byTeam.get(query.teamId) ?? []) : w.fixtures;
    list = list.filter((f) => f.kickoffTs >= from && f.kickoffTs <= to);
    if (query.teamId) list = list.filter((f) => f.home.id === query.teamId || f.away.id === query.teamId);
    if (query.countryCode) list = list.filter((f) => f.competition.country.code === query.countryCode);
    let matches = list.map((f) => this.toMatch(f));
    if (query.status?.length) matches = matches.filter((m) => query.status!.includes(m.status));
    return query.limit ? matches.slice(0, query.limit) : matches;
  }

  async getMatch(id: string): Promise<Match | null> {
    const f = this.world().byId.get(id);
    return f ? this.toMatch(f) : null;
  }

  async getTeam(id: string): Promise<Team | null> {
    return this.world().teams.get(id) ?? null;
  }

  async getTeams(): Promise<Team[]> {
    return [...this.world().teams.values()];
  }

  async getTeamForm(teamId: string, options: HistoryOptions = {}): Promise<TeamMatchRecord[]> {
    const w = this.world();
    const beforeTs = options.before ? new Date(options.before).getTime() : this.clock();
    const list = (w.byTeam.get(teamId) ?? []).filter((f) => this.isFinished(f, beforeTs));
    const records = list
      .slice()
      .reverse()
      .slice(0, options.limit ?? 10)
      .map((f): TeamMatchRecord => {
        const isHome = f.home.id === teamId;
        const r = f.result!;
        const gf = isHome ? r.home : r.away;
        const ga = isHome ? r.away : r.home;
        return {
          matchId: f.id,
          date: new Date(f.kickoffTs).toISOString(),
          competitionId: f.competition.id,
          competitionName: f.competition.name,
          opponent: toRef(isHome ? f.away : f.home),
          venue: isHome ? "home" : "away",
          goalsFor: gf,
          goalsAgainst: ga,
          result: gf > ga ? "W" : gf === ga ? "D" : "L",
          stats: isHome ? r.statsHome : r.statsAway,
          opponentStats: isHome ? r.statsAway : r.statsHome,
        };
      });
    return records;
  }

  async getTeamStats(teamId: string, options: HistoryOptions = {}): Promise<TeamStatsSummary> {
    const records = await this.getTeamForm(teamId, { ...options, limit: options.limit ?? 20 });
    return summarizeTeamRecords(teamId, records);
  }

  async getHeadToHead(teamAId: string, teamBId: string, options: HistoryOptions = {}): Promise<HeadToHeadMatch[]> {
    const w = this.world();
    const beforeTs = options.before ? new Date(options.before).getTime() : this.clock();
    return (w.byTeam.get(teamAId) ?? [])
      .filter((f) => (f.home.id === teamBId || f.away.id === teamBId) && this.isFinished(f, beforeTs))
      .reverse()
      .slice(0, options.limit ?? 6)
      .map((f) => ({
        matchId: f.id,
        date: new Date(f.kickoffTs).toISOString(),
        competitionName: f.competition.name,
        homeTeam: toRef(f.home),
        awayTeam: toRef(f.away),
        score: { home: f.result!.home, away: f.result!.away },
      }));
  }

  async getStandings(competitionId: string): Promise<Standings | null> {
    const w = this.world();
    const fixtures = w.byCompetition.get(competitionId);
    if (!fixtures?.length) return null;
    const now = this.clock();
    // Saison en cours = celle du prochain match (ou du dernier joué).
    const upcoming = fixtures.find((f) => f.kickoffTs >= now) ?? fixtures[fixtures.length - 1];
    const season = upcoming.season;
    const rows = new Map<string, StandingRow>();
    const teamsOfSeason = fixtures.filter((f) => f.season === season);
    for (const f of teamsOfSeason) {
      for (const t of [f.home, f.away]) {
        if (!rows.has(t.id)) {
          rows.set(t.id, { position: 0, team: toRef(t), played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] });
        }
      }
    }
    for (const f of teamsOfSeason) {
      if (!this.isFinished(f, now)) continue;
      const r = f.result!;
      const apply = (row: StandingRow, gf: number, ga: number) => {
        row.played++;
        row.goalsFor += gf;
        row.goalsAgainst += ga;
        const res = gf > ga ? "W" : gf === ga ? "D" : "L";
        if (res === "W") {
          row.won++;
          row.points += 3;
        } else if (res === "D") {
          row.drawn++;
          row.points += 1;
        } else row.lost++;
        row.form = [res, ...row.form].slice(0, 5) as StandingRow["form"];
      };
      apply(rows.get(f.home.id)!, r.home, r.away);
      apply(rows.get(f.away.id)!, r.away, r.home);
    }
    const sorted = [...rows.values()].sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor ||
        a.team.name.localeCompare(b.team.name),
    );
    sorted.forEach((r, i) => (r.position = i + 1));
    return {
      competitionId,
      season: upcoming.competition.season,
      rows: sorted,
      updatedAt: new Date(now).toISOString(),
    };
  }

  async getOdds(matchId: string): Promise<MatchOdds | null> {
    const f = this.world().byId.get(matchId);
    if (!f) return null;
    const history = demoOddsHistory(f, this.clock());
    if (!history) return null;
    const latest = history[history.length - 1];
    return {
      matchId,
      bookmaker: "Bookmaker démo",
      updatedAt: latest.timestamp,
      isDemo: true,
      markets: latest.odds,
      history,
    };
  }

  async getAvailability(): Promise<MatchAvailability> {
    // Aucune donnée d'absence en démo : on ne fabrique jamais d'information
    // de blessure ou de suspension.
    return { home: null, away: null };
  }

  async getLiveSnapshot(matchId: string): Promise<LiveSnapshot | null> {
    const f = this.world().byId.get(matchId);
    if (!f) return null;
    const match = this.toMatch(f);
    const now = this.clock();
    const base = {
      matchId,
      status: match.status,
      minute: match.minute,
      score: match.score,
      updatedAt: new Date(now).toISOString(),
      isDemo: true,
    };
    if (!f.result || match.status === "SCHEDULED" || match.status === "POSTPONED") {
      return { ...base, events: [], stats: null, odds: null };
    }
    const minute = match.status === "FINISHED" ? 90 : (match.minute ?? 0);
    const ratio = Math.min(1, minute / 90);
    return {
      ...base,
      events: f.result.events.filter((e) => e.minute <= minute),
      stats: { home: scaleStats(f.result.statsHome, ratio), away: scaleStats(f.result.statsAway, ratio) },
      odds: match.status === "FINISHED" ? null : demoLiveOdds(f, minute, match.score ?? { home: 0, away: 0 }),
    };
  }
}
