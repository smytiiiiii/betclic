/**
 * Génération déterministe d'un « monde » de football FICTIF pour la démo.
 *
 * - Les compétitions et équipes sont inventées (voir data.ts).
 * - Chaque équipe possède une force cachée (attaque/défense) qui varie
 *   lentement dans le temps, ce qui crée des séries de forme.
 * - Les résultats sont simulés (Poisson autour de xG simulés).
 * - Le calendrier est ancré sur une date fixe : un même match a toujours le
 *   même résultat, et les statuts (à venir / en direct / terminé) dépendent
 *   de l'heure courante.
 */
import type {
  Competition,
  MarketKey,
  MatchEvent,
  OddsSnapshot,
  Team,
  TeamMatchStats,
} from "@/lib/domain/types";
import { goalMarketProbabilities } from "@/lib/engine/analyze";
import { negBinomialOver, scoreMatrix } from "@/lib/engine/math";
import { DEMO_COMPETITIONS, KIT_COLORS, type DemoCompetitionSeed } from "./data";
import { Rng } from "./random";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ANCHOR = Date.UTC(2025, 0, 3);
const ROUND_DAYS = 3;
const ROUNDS_PER_SEASON = 22;
const SLOT_TIMES_UTC: [number, number][] = [
  [12, 0],
  [14, 0],
  [16, 0],
  [16, 0],
  [18, 0],
  [19, 45],
];
const HISTORY_DAYS = 220;
const FUTURE_DAYS = 35;
/** Délai de publication des cotes de démo avant le coup d'envoi. */
const ODDS_OPENING_HOURS = 120;
const ODDS_SNAPSHOT_HOURS = [120, 72, 48, 24, 12, 6, 2, 0.25];

interface TeamStrength {
  attack: number;
  defense: number;
  amplitude: number;
  period: number;
  phase: number;
  cornerBias: number;
  discipline: number;
}

export interface SimulatedResult {
  home: number;
  away: number;
  htHome: number;
  htAway: number;
  statsHome: TeamMatchStats;
  statsAway: TeamMatchStats;
  events: MatchEvent[];
}

export interface Fixture {
  id: string;
  seed: DemoCompetitionSeed;
  competition: Competition;
  globalRound: number;
  roundInSeason: number;
  season: number;
  kickoffTs: number;
  home: Team;
  away: Team;
  postponed: boolean;
  lambdaHome: number;
  lambdaAway: number;
  cornersMeanHome: number;
  cornersMeanAway: number;
  result: SimulatedResult | null;
}

export interface DemoWorld {
  competitions: Competition[];
  teams: Map<string, Team>;
  fixtures: Fixture[];
  byId: Map<string, Fixture>;
  byTeam: Map<string, Fixture[]>;
  byCompetition: Map<string, Fixture[]>;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function teamCode(shortName: string): string {
  const letters = slug(shortName).replace(/-/g, "").toUpperCase();
  return letters.slice(0, 3).padEnd(3, "X");
}

function buildTeams(seed: DemoCompetitionSeed): Team[] {
  const rng = new Rng(`colors:${seed.id}`);
  const palette = rng.shuffle(KIT_COLORS);
  return seed.teams.map((t, i) => ({
    id: `${seed.code}-${slug(t.shortName)}`,
    name: t.name,
    shortName: t.shortName,
    code: teamCode(t.shortName),
    logo: null,
    colors: { primary: palette[i % palette.length][0], secondary: palette[i % palette.length][1] },
    countryCode: seed.country.code,
    venue: { name: t.stadium, city: t.city, capacity: 8000 + new Rng(`cap:${t.name}`).int(0, 52) * 1000 },
  }));
}

function strengthOf(teamId: string): TeamStrength {
  const rng = new Rng(`strength:${teamId}`);
  return {
    attack: rng.normal(0, 0.2),
    defense: rng.normal(0, 0.17),
    amplitude: 0.05 + rng.next() * 0.09,
    period: 10 + rng.next() * 18,
    phase: rng.next() * Math.PI * 2,
    cornerBias: rng.normal(0, 0.1),
    discipline: rng.normal(0, 0.15),
  };
}

function strengthAt(s: TeamStrength, round: number) {
  const wave = Math.sin((2 * Math.PI * round) / s.period + s.phase);
  return {
    attack: s.attack + s.amplitude * wave,
    defense: s.defense + s.amplitude * 0.7 * Math.sin((2 * Math.PI * round) / s.period + s.phase + 0.6),
  };
}

/** Appariements d'une journée (méthode du cercle), aller puis retour. */
function pairings(teamCount: number, roundInSeason: number, order: number[]): [number, number][] {
  const half = teamCount - 1;
  const k = roundInSeason % half;
  const secondLeg = roundInSeason >= half;
  const rest = order.slice(1);
  const rotated = rest.slice(rest.length - k).concat(rest.slice(0, rest.length - k));
  const arr = [order[0], ...rotated];
  const out: [number, number][] = [];
  for (let i = 0; i < teamCount / 2; i++) {
    const a = arr[i];
    const b = arr[teamCount - 1 - i];
    let pair: [number, number] = (k + i) % 2 === 0 ? [a, b] : [b, a];
    if (secondLeg) pair = [pair[1], pair[0]];
    out.push(pair);
  }
  return out;
}

function emptyStats(): TeamMatchStats {
  return {
    possession: null,
    shots: null,
    shotsOnTarget: null,
    corners: null,
    yellowCards: null,
    redCards: null,
    fouls: null,
    xg: null,
    bigChances: null,
  };
}

function simulate(f: Omit<Fixture, "result">, sh: TeamStrength, sa: TeamStrength): SimulatedResult {
  const rng = new Rng(`sim:${f.id}`);
  const xgHome = Math.max(0.08, f.lambdaHome * Math.exp(rng.normal(0, 0.28)));
  const xgAway = Math.max(0.08, f.lambdaAway * Math.exp(rng.normal(0, 0.28)));
  const home = Math.min(8, rng.poisson(xgHome * Math.exp(rng.normal(0, 0.12))));
  const away = Math.min(8, rng.poisson(xgAway * Math.exp(rng.normal(0, 0.12))));

  const hs = strengthAt(sh, f.globalRound);
  const as = strengthAt(sa, f.globalRound);
  const possHome = Math.round(Math.min(72, Math.max(28, 52 + 14 * (hs.attack + hs.defense - as.attack - as.defense) + rng.normal(0, 4.5))));

  const mkStats = (xg: number, goals: number, possession: number, cornersMean: number, discipline: number, isAway: boolean): TeamMatchStats => {
    const shots = Math.max(goals + 1, Math.round(xg * 7.2 + 4 + rng.normal(0, 2.2)));
    const onTarget = Math.min(shots, Math.max(goals, Math.round(shots * 0.34 + rng.normal(0, 1.2))));
    return {
      possession,
      shots,
      shotsOnTarget: onTarget,
      corners: rng.poisson(cornersMean * Math.exp(rng.normal(0, 0.12))),
      yellowCards: rng.poisson(Math.max(0.4, 1.75 + (isAway ? 0.2 : 0) + discipline)),
      redCards: rng.chance(0.045) ? 1 : 0,
      fouls: rng.poisson(11 + discipline * 4),
      xg: Math.round(xg * 100) / 100,
      bigChances: rng.poisson(xg * 1.25),
    };
  };
  const statsHome = mkStats(xgHome, home, possHome, f.cornersMeanHome, sh.discipline, false);
  const statsAway = mkStats(xgAway, away, 100 - possHome, f.cornersMeanAway, sa.discipline, true);

  // --- Chronologie des événements ------------------------------------------
  const events: MatchEvent[] = [];
  const usedMinutes = new Set<number>();
  const minute = () => {
    let m = rng.int(1, 90);
    while (usedMinutes.has(m)) m = (m % 90) + 1;
    usedMinutes.add(m);
    return m;
  };
  const shirt = () => `N°${rng.int(2, 11)}`;
  const push = (type: MatchEvent["type"], side: "home" | "away", detail: string | null = null) =>
    events.push({ id: `${f.id}-e${events.length}`, minute: minute(), type, side, player: shirt(), detail });

  for (let i = 0; i < home; i++) push(rng.chance(0.1) ? "penalty_goal" : "goal", "home");
  for (let i = 0; i < away; i++) push(rng.chance(0.1) ? "penalty_goal" : "goal", "away");
  for (let i = 0; i < (statsHome.yellowCards ?? 0); i++) push("yellow", "home");
  for (let i = 0; i < (statsAway.yellowCards ?? 0); i++) push("yellow", "away");
  if (statsHome.redCards) push("red", "home");
  if (statsAway.redCards) push("red", "away");
  for (let i = 0; i < 3; i++) {
    push("substitution", "home", "Changement tactique");
    push("substitution", "away", "Changement tactique");
  }
  events.sort((a, b) => a.minute - b.minute);

  const goalsBefore = (side: "home" | "away", m: number) =>
    events.filter((e) => e.side === side && (e.type === "goal" || e.type === "penalty_goal") && e.minute <= m).length;

  return {
    home,
    away,
    htHome: goalsBefore("home", 45),
    htAway: goalsBefore("away", 45),
    statsHome,
    statsAway,
    events,
  };
}

function buildWorld(nowTs: number): DemoWorld {
  const competitions: Competition[] = [];
  const teams = new Map<string, Team>();
  const fixtures: Fixture[] = [];

  for (const seed of DEMO_COMPETITIONS) {
    const compTeams = buildTeams(seed);
    compTeams.forEach((t) => teams.set(t.id, t));
    const strengths = compTeams.map((t) => strengthOf(t.id));
    const origin = ANCHOR + seed.dayOffset * DAY;
    const rMin = Math.max(0, Math.floor((nowTs - HISTORY_DAYS * DAY - origin) / (ROUND_DAYS * DAY)));
    const rMax = Math.ceil((nowTs + FUTURE_DAYS * DAY - origin) / (ROUND_DAYS * DAY));
    const currentSeason = Math.floor(Math.max(0, (nowTs - origin) / (ROUND_DAYS * DAY)) / ROUNDS_PER_SEASON);

    const competition: Competition = {
      id: seed.id,
      name: seed.name,
      shortName: seed.shortName,
      country: seed.country,
      logo: null,
      type: "league",
      season: `Saison démo ${currentSeason + 1}`,
      isDemo: true,
    };
    competitions.push(competition);

    const orders = new Map<number, number[]>();
    for (let r = rMin; r <= rMax; r++) {
      const season = Math.floor(r / ROUNDS_PER_SEASON);
      const roundInSeason = r % ROUNDS_PER_SEASON;
      if (!orders.has(season)) {
        orders.set(season, new Rng(`order:${seed.id}:${season}`).shuffle(compTeams.map((_, i) => i)));
      }
      const pairs = pairings(compTeams.length, roundInSeason, orders.get(season)!);
      const dayTs = origin + r * ROUND_DAYS * DAY;
      const slotOrder = new Rng(`slots:${seed.id}:${r}`).shuffle(SLOT_TIMES_UTC);

      pairs.forEach(([hi, ai], slot) => {
        const home = compTeams[hi];
        const away = compTeams[ai];
        const hs = strengthAt(strengths[hi], r);
        const as = strengthAt(strengths[ai], r);
        const base = Math.log(seed.baseGoals);
        const lambdaHome = Math.exp(base + seed.homeAdvantage + hs.attack - as.defense);
        const lambdaAway = Math.exp(base + as.attack - hs.defense);
        const [hh, mm] = slotOrder[slot];
        const id = `d-${seed.code}-${r}-${slot}`;
        const partial = {
          id,
          seed,
          competition: { ...competition, season: `Saison démo ${season + 1}` },
          globalRound: r,
          roundInSeason,
          season,
          kickoffTs: dayTs + hh * HOUR + mm * 60_000,
          home,
          away,
          postponed: new Rng(`postponed:${id}`).chance(0.012),
          lambdaHome,
          lambdaAway,
          cornersMeanHome: 5.3 * Math.exp(0.9 * (hs.attack - as.defense) + strengths[hi].cornerBias),
          cornersMeanAway: 4.5 * Math.exp(0.9 * (as.attack - hs.defense) + strengths[ai].cornerBias),
        };
        fixtures.push({
          ...partial,
          result: partial.postponed ? null : simulate(partial, strengths[hi], strengths[ai]),
        });
      });
    }
  }

  fixtures.sort((a, b) => a.kickoffTs - b.kickoffTs || a.id.localeCompare(b.id));
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const byTeam = new Map<string, Fixture[]>();
  const byCompetition = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    for (const t of [f.home.id, f.away.id]) {
      const list = byTeam.get(t) ?? [];
      list.push(f);
      byTeam.set(t, list);
    }
    const list = byCompetition.get(f.competition.id) ?? [];
    list.push(f);
    byCompetition.set(f.competition.id, list);
  }
  return { competitions, teams, fixtures, byId, byTeam, byCompetition };
}

let cached: { day: number; world: DemoWorld } | null = null;

/** Monde de démo (mis en cache par jour UTC). */
export function getDemoWorld(nowTs = Date.now()): DemoWorld {
  const day = Math.floor(nowTs / DAY);
  if (!cached || cached.day !== day) cached = { day, world: buildWorld(nowTs) };
  return cached.world;
}

// --- Statut en fonction de l'heure ------------------------------------------

export interface FixtureState {
  status: "SCHEDULED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED";
  minute: number | null;
}

export function fixtureState(f: Fixture, nowTs: number): FixtureState {
  if (f.postponed) return { status: "POSTPONED", minute: null };
  const elapsed = (nowTs - f.kickoffTs) / 60_000;
  if (elapsed < 0) return { status: "SCHEDULED", minute: null };
  if (elapsed < 48) return { status: "LIVE", minute: Math.min(45, Math.floor(elapsed) + 1) };
  if (elapsed < 63) return { status: "HALFTIME", minute: 45 };
  if (elapsed < 112) return { status: "LIVE", minute: Math.min(90, 46 + Math.floor(elapsed - 63)) };
  return { status: "FINISHED", minute: 90 };
}

// --- Cotes de démonstration --------------------------------------------------

const MARGINS: Record<string, number> = { "1X2": 0.055, DC: 0.03, OU: 0.06, BTTS: 0.06, CORNERS: 0.08 };

function oddsFromProbabilities(
  probs: Partial<Record<MarketKey, number>>,
): Partial<Record<MarketKey, number>> {
  const out: Partial<Record<MarketKey, number>> = {};
  for (const [k, p] of Object.entries(probs) as [MarketKey, number][]) {
    if (p < 0.025 || p > 0.975) continue;
    const group = k.startsWith("1X2") ? "1X2" : k.startsWith("DC") ? "DC" : k.startsWith("OU") ? "OU" : k.startsWith("BTTS") ? "BTTS" : "CORNERS";
    const price = 1 / (p * (1 + MARGINS[group]));
    out[k] = Math.max(1.01, Math.floor(price * 100) / 100);
  }
  return out;
}

function bookmakerOdds(f: Fixture, drift: number, driftRng: Rng): Partial<Record<MarketKey, number>> {
  const noise = new Rng(`book:${f.id}`);
  const lh = f.lambdaHome * Math.exp(noise.normal(0, 0.09) + drift * driftRng.normal(0, 1));
  const la = f.lambdaAway * Math.exp(noise.normal(0, 0.09) + drift * driftRng.normal(0, 1));
  const g = goalMarketProbabilities(scoreMatrix(lh, la, -0.05));
  const cornersTotal = (f.cornersMeanHome + f.cornersMeanAway) * Math.exp(noise.normal(0, 0.07));
  const probs: Partial<Record<MarketKey, number>> = { ...g };
  for (const line of [8.5, 9.5, 10.5]) {
    const over = negBinomialOver(line, cornersTotal, 20);
    probs[`CORNERS_${Math.floor(line)}_5_OVER` as MarketKey] = over;
    probs[`CORNERS_${Math.floor(line)}_5_UNDER` as MarketKey] = 1 - over;
  }
  return oddsFromProbabilities(probs);
}

/** Historique des cotes de démo publiées avant `nowTs` (null si non publiées). */
export function demoOddsHistory(f: Fixture, nowTs: number): OddsSnapshot[] | null {
  if (f.postponed) return null;
  if (nowTs < f.kickoffTs - ODDS_OPENING_HOURS * HOUR) return null;
  const driftRng = new Rng(`drift:${f.id}`);
  const snapshots: OddsSnapshot[] = [];
  for (const h of ODDS_SNAPSHOT_HOURS) {
    const ts = f.kickoffTs - h * HOUR;
    // La dérive diminue à l'approche du match : la dernière cote est la « clôture ».
    const drift = 0.006 * Math.sqrt(h);
    const odds = bookmakerOdds(f, drift, driftRng);
    if (ts <= nowTs) snapshots.push({ timestamp: new Date(ts).toISOString(), odds });
  }
  return snapshots.length ? snapshots : null;
}

/**
 * Cotes 1X2 « en direct » de démo : probabilités recalculées à partir du
 * score courant et du temps restant.
 */
export function demoLiveOdds(
  f: Fixture,
  minute: number,
  score: { home: number; away: number },
): Partial<Record<MarketKey, number>> {
  const remaining = Math.max(0.02, (90 - minute) / 90);
  const m = scoreMatrix(f.lambdaHome * remaining, f.lambdaAway * remaining, 0);
  let pH = 0;
  let pD = 0;
  let pA = 0;
  let pOver = 0;
  m.forEach((row, h) =>
    row.forEach((p, a) => {
      const fh = score.home + h;
      const fa = score.away + a;
      if (fh > fa) pH += p;
      else if (fh === fa) pD += p;
      else pA += p;
      if (fh + fa > 2.5) pOver += p;
    }),
  );
  return oddsFromProbabilities({
    "1X2_HOME": pH,
    "1X2_DRAW": pD,
    "1X2_AWAY": pA,
    OU_2_5_OVER: pOver,
    OU_2_5_UNDER: 1 - pOver,
  });
}

export { emptyStats };
