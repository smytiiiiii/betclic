import type { TeamMatchRecord } from "@/lib/domain/types";
import { recencyWeights, round, weightedMean } from "./math";
import { summarizeTeamRecords } from "./team-stats";
import type { TeamProfile } from "./types";

const DAY = 86_400_000;

const points = (r: TeamMatchRecord) => (r.result === "W" ? 3 : r.result === "D" ? 1 : 0);

/**
 * Construit le profil statistique d'une équipe à partir de ses matchs
 * passés (du plus récent au plus ancien), pondérés par récence.
 */
export function buildTeamProfile(
  teamId: string,
  allRecords: TeamMatchRecord[],
  venue: "home" | "away",
  kickoff: string,
  window: number,
  halfLife: number,
): TeamProfile {
  const records = allRecords.slice(0, window);
  const weights = recencyWeights(records.length, halfLife);
  const venueRecords = records.filter((r) => r.venue === venue);
  const venueWeights = recencyWeights(venueRecords.length, halfLife);

  const wm = (vals: number[], w = weights) => weightedMean(vals, w);

  const xgRecords = records.filter((r) => typeof r.stats?.xg === "number" && typeof r.opponentStats?.xg === "number");
  const xgWeights = recencyWeights(xgRecords.length, halfLife);
  const cornerRecords = records.filter(
    (r) => typeof r.stats?.corners === "number" && typeof r.opponentStats?.corners === "number",
  );
  const cornerWeights = recencyWeights(cornerRecords.length, halfLife);

  const last5 = records.slice(0, 5);
  const kickoffTs = new Date(kickoff).getTime();
  const last = records[0];
  const restDays = last ? Math.max(0, Math.round(((kickoffTs - new Date(last.date).getTime()) / DAY) * 10) / 10) : null;
  const matchesLast14Days = records.filter((r) => kickoffTs - new Date(r.date).getTime() <= 14 * DAY).length;

  return {
    teamId,
    sample: records.length,
    venue,
    venueSample: venueRecords.length,
    goalsFor: round(wm(records.map((r) => r.goalsFor)) ?? 0, 3),
    goalsAgainst: round(wm(records.map((r) => r.goalsAgainst)) ?? 0, 3),
    venueGoalsFor: venueRecords.length ? round(wm(venueRecords.map((r) => r.goalsFor), venueWeights) ?? 0, 3) : null,
    venueGoalsAgainst: venueRecords.length
      ? round(wm(venueRecords.map((r) => r.goalsAgainst), venueWeights) ?? 0, 3)
      : null,
    xgFor: xgRecords.length ? round(wm(xgRecords.map((r) => r.stats!.xg!), xgWeights) ?? 0, 3) : null,
    xgAgainst: xgRecords.length ? round(wm(xgRecords.map((r) => r.opponentStats!.xg!), xgWeights) ?? 0, 3) : null,
    xgCoverage: records.length ? xgRecords.length / records.length : 0,
    cornersFor: cornerRecords.length
      ? round(wm(cornerRecords.map((r) => r.stats!.corners!), cornerWeights) ?? 0, 3)
      : null,
    cornersAgainst: cornerRecords.length
      ? round(wm(cornerRecords.map((r) => r.opponentStats!.corners!), cornerWeights) ?? 0, 3)
      : null,
    pointsPerMatchLast5: last5.length ? round(last5.reduce((s, r) => s + points(r), 0) / last5.length, 2) : 0,
    venuePointsPerMatch: venueRecords.length
      ? round(venueRecords.reduce((s, r) => s + points(r), 0) / venueRecords.length, 2)
      : null,
    form: last5.map((r) => r.result),
    restDays,
    matchesLast14Days,
    summary: summarizeTeamRecords(teamId, records),
    venueSummary: summarizeTeamRecords(teamId, venueRecords),
  };
}
