import "server-only";
import { z } from "zod";
import { env } from "@/lib/config/env";
import type { Competition, Match, MatchStatus, Team } from "@/lib/domain/types";
import { getProvider } from "@/lib/providers";
import { addDays, isDayKey, localDateKey, localHour, zonedDayRange } from "@/lib/time";
import { buildMatchCards } from "./analysis";
import type { MatchCardDTO } from "./dto";

export const STATUS_FILTERS = ["all", "upcoming", "live", "finished"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_GROUPS: Record<StatusFilter, MatchStatus[] | null> = {
  all: null,
  upcoming: ["SCHEDULED"],
  live: ["LIVE", "HALFTIME"],
  finished: ["FINISHED"],
};

export const matchFiltersSchema = z.object({
  date: z.string().refine(isDayKey, "Date invalide (AAAA-MM-JJ)").optional(),
  competition: z.string().max(64).optional(),
  country: z.string().max(8).optional(),
  team: z.string().max(64).optional(),
  q: z.string().trim().max(80).optional(),
  status: z.enum(STATUS_FILTERS).optional(),
  from: z.coerce.number().int().min(0).max(23).optional(),
  to: z.coerce.number().int().min(0).max(23).optional(),
});

export type MatchFilters = z.infer<typeof matchFiltersSchema>;

/** Convertit des searchParams en filtres valides (les valeurs invalides sont ignorées). */
export function parseMatchFilters(params: Record<string, string | string[] | undefined>): MatchFilters {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined && value !== "") flat[k] = value;
  }
  const out: MatchFilters = {};
  const shape = matchFiltersSchema.shape;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    if (flat[key] === undefined) continue;
    const r = shape[key].safeParse(flat[key]);
    if (r.success) (out as Record<string, unknown>)[key] = r.data;
  }
  return out;
}

export function todayKey() {
  return localDateKey(new Date(), env().APP_TIMEZONE);
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function applyFilters(matches: Match[], f: MatchFilters, tz: string): Match[] {
  const group = STATUS_GROUPS[f.status ?? "all"];
  const q = f.q ? normalize(f.q) : null;
  return matches.filter((m) => {
    if (group && !group.includes(m.status)) return false;
    if (f.competition && m.competition.id !== f.competition) return false;
    if (f.country && m.competition.country.code !== f.country) return false;
    if (f.team && m.homeTeam.id !== f.team && m.awayTeam.id !== f.team) return false;
    if (f.from !== undefined || f.to !== undefined) {
      const h = localHour(m.kickoff, tz);
      if (f.from !== undefined && h < f.from) return false;
      if (f.to !== undefined && h > f.to) return false;
    }
    if (q) {
      const hay = normalize(`${m.homeTeam.name} ${m.awayTeam.name} ${m.competition.name} ${m.competition.country.name}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function getMatchesForDay(dayKey: string): Promise<Match[]> {
  const tz = env().APP_TIMEZONE;
  const { start, end } = zonedDayRange(dayKey, tz);
  return getProvider().getMatches({ from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString() });
}

export interface MatchListResult {
  /** Jour affiché, ou null en mode « équipe » (plage de dates). */
  day: string | null;
  range: { from: string; to: string } | null;
  cards: MatchCardDTO[];
  total: number;
}

export async function listMatchCards(filters: MatchFilters): Promise<MatchListResult> {
  const tz = env().APP_TIMEZONE;
  // Filtre équipe sans date : on affiche ses matchs de J-7 à J+14.
  if (filters.team && !filters.date) {
    const today = todayKey();
    const from = addDays(today, -7);
    const to = addDays(today, 14);
    const all = await getProvider().getMatches({
      teamId: filters.team,
      from: zonedDayRange(from, tz).start.toISOString(),
      to: zonedDayRange(to, tz).end.toISOString(),
    });
    const filtered = applyFilters(all, filters, tz);
    return { day: null, range: { from, to }, cards: await buildMatchCards(filtered), total: all.length };
  }
  const day = filters.date ?? todayKey();
  const all = await getMatchesForDay(day);
  const filtered = applyFilters(all, filters, tz);
  const cards = await buildMatchCards(filtered);
  return { day, range: null, cards, total: all.length };
}

export interface FilterOptions {
  competitions: Competition[];
  countries: { code: string; name: string; flag: string }[];
  teams: Pick<Team, "id" | "name" | "shortName">[];
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const provider = getProvider();
  const [competitions, teams] = await Promise.all([provider.getCompetitions(), provider.getTeams()]);
  const countries = new Map<string, { code: string; name: string; flag: string }>();
  competitions.forEach((c) => countries.set(c.country.code, c.country));
  return {
    competitions,
    countries: [...countries.values()].sort((a, b) => a.name.localeCompare(b.name)),
    teams: teams.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export interface SearchResult {
  type: "match" | "team" | "competition";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/** Recherche rapide (palette de commande). */
export async function search(query: string): Promise<SearchResult[]> {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const provider = getProvider();
  const tz = env().APP_TIMEZONE;
  const today = todayKey();
  const { start } = zonedDayRange(addDays(today, -2), tz);
  const { end } = zonedDayRange(addDays(today, 7), tz);
  const [competitions, teams, matches] = await Promise.all([
    provider.getCompetitions(),
    provider.getTeams(),
    provider.getMatches({ from: start.toISOString(), to: end.toISOString() }),
  ]);
  const results: SearchResult[] = [];
  for (const c of competitions) {
    if (normalize(`${c.name} ${c.country.name}`).includes(q)) {
      results.push({ type: "competition", id: c.id, title: c.name, subtitle: c.country.name, href: `/matches?competition=${encodeURIComponent(c.id)}` });
    }
  }
  for (const t of teams) {
    if (normalize(t.name).includes(q)) {
      results.push({ type: "team", id: t.id, title: t.name, subtitle: "Équipe", href: `/matches?team=${encodeURIComponent(t.id)}` });
    }
  }
  const matchResults = matches
    .filter((m) => normalize(`${m.homeTeam.name} ${m.awayTeam.name}`).includes(q))
    .slice(0, 8)
    .map((m): SearchResult => ({
      type: "match",
      id: m.id,
      title: `${m.homeTeam.name} – ${m.awayTeam.name}`,
      subtitle: `${m.competition.name} · ${new Intl.DateTimeFormat("fr-FR", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(m.kickoff))}`,
      href: `/matches/${encodeURIComponent(m.id)}`,
    }));
  return [...matchResults, ...results].slice(0, 20);
}
