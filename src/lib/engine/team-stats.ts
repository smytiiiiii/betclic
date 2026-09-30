import type { TeamMatchRecord, TeamMatchStats, TeamStatsSummary } from "@/lib/domain/types";
import { mean, round } from "./math";

type NumericStat = Exclude<keyof TeamMatchStats, never>;

function avgStat(records: TeamMatchRecord[], key: NumericStat, from: "stats" | "opponentStats" = "stats") {
  const values = records
    .map((r) => r[from]?.[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  // On exige au moins 3 valeurs pour afficher une moyenne.
  if (values.length < Math.min(3, records.length) || values.length === 0) return null;
  const m = mean(values);
  return m === null ? null : round(m, 2);
}

/** Agrège une liste de matchs passés en statistiques moyennes. */
export function summarizeTeamRecords(teamId: string, records: TeamMatchRecord[]): TeamStatsSummary {
  const n = records.length;
  const rate = (pred: (r: TeamMatchRecord) => boolean) => (n ? round(records.filter(pred).length / n, 3) : 0);
  const wins = records.filter((r) => r.result === "W").length;
  const draws = records.filter((r) => r.result === "D").length;
  const losses = records.filter((r) => r.result === "L").length;
  const withStats = records.filter((r) => r.stats !== null).length;
  const withXg = records.filter((r) => typeof r.stats?.xg === "number").length;
  const cardValues = records
    .map((r) => (r.stats?.yellowCards ?? null) === null ? null : (r.stats!.yellowCards ?? 0) + (r.stats!.redCards ?? 0))
    .filter((v): v is number => v !== null);

  return {
    teamId,
    sample: n,
    wins,
    draws,
    losses,
    goalsForPerMatch: n ? round(records.reduce((s, r) => s + r.goalsFor, 0) / n, 2) : 0,
    goalsAgainstPerMatch: n ? round(records.reduce((s, r) => s + r.goalsAgainst, 0) / n, 2) : 0,
    possession: avgStat(records, "possession"),
    shots: avgStat(records, "shots"),
    shotsOnTarget: avgStat(records, "shotsOnTarget"),
    corners: avgStat(records, "corners"),
    cornersAgainst: avgStat(records, "corners", "opponentStats"),
    cards: cardValues.length >= 3 ? round(mean(cardValues) ?? 0, 2) : null,
    xg: avgStat(records, "xg"),
    xga: avgStat(records, "xg", "opponentStats"),
    bigChances: avgStat(records, "bigChances"),
    cleanSheetRate: rate((r) => r.goalsAgainst === 0),
    failedToScoreRate: rate((r) => r.goalsFor === 0),
    bttsRate: rate((r) => r.goalsFor > 0 && r.goalsAgainst > 0),
    over15Rate: rate((r) => r.goalsFor + r.goalsAgainst > 1.5),
    over25Rate: rate((r) => r.goalsFor + r.goalsAgainst > 2.5),
    over35Rate: rate((r) => r.goalsFor + r.goalsAgainst > 3.5),
    pointsPerMatch: n ? round((wins * 3 + draws) / n, 2) : 0,
    statsCoverage: n ? round(withStats / n, 2) : 0,
    xgCoverage: n ? round(withXg / n, 2) : 0,
  };
}
