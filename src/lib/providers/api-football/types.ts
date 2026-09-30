/** Sous-ensemble typé des réponses de l'API-Football v3 utilisées par l'adaptateur. */

export interface AfTeam {
  id: number;
  name: string;
  logo?: string | null;
}

export interface AfFixture {
  fixture: {
    id: number;
    referee: string | null;
    timestamp: number;
    venue?: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    country?: string;
    logo?: string | null;
    flag?: string | null;
    season?: number;
    round?: string | null;
  };
  teams: { home: AfTeam; away: AfTeam };
  goals: { home: number | null; away: number | null };
  score?: { halftime?: { home: number | null; away: number | null } };
}

export interface AfLeague {
  league: { id: number; name: string; type?: string; logo?: string | null };
  country?: { name: string; code: string | null; flag: string | null };
}

export interface AfStatisticsBlock {
  team: AfTeam;
  statistics: { type: string; value: number | string | null }[];
}

export interface AfStandingsResponse {
  league: {
    id: number;
    standings: {
      rank: number;
      team: AfTeam;
      points: number;
      form: string | null;
      all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
    }[][];
  };
}

export interface AfOddsResponse {
  update?: string;
  bookmakers: {
    id: number;
    name: string;
    bets: { id: number; name: string; values: { value: string; odd: string }[] }[];
  }[];
}

export interface AfInjury {
  player: { id: number; name: string; type: string; reason: string | null };
  team: AfTeam;
}

export interface AfTeamResponse {
  team: AfTeam & { code?: string | null; country?: string };
  venue?: { name: string | null; city: string | null; capacity?: number | null };
}

export interface AfEvent {
  time: { elapsed: number; extra: number | null };
  team: AfTeam;
  player?: { id: number | null; name: string | null };
  type: string;
  detail: string | null;
}
