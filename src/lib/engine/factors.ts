import { FACTOR_KEYS, FACTOR_LABELS, type FactorKey, type ModelSettings } from "@/lib/domain/settings";
import type { HeadToHeadMatch, MatchAvailability } from "@/lib/domain/types";
import { clamp, round } from "./math";
import type { FactorContribution, TeamProfile } from "./types";

/**
 * Facteurs qui ne sont PAS déjà intégrés dans l'estimation des buts attendus
 * (buts/xG/défense/domicile le sont). Seuls ceux-ci ajustent λ, afin
 * d'éviter de compter deux fois la même information.
 */
export const ADJUSTING_FACTORS: FactorKey[] = ["form", "h2h", "availability", "schedule"];

interface RawFactor {
  available: boolean;
  value: number;
  homeDisplay: string;
  awayDisplay: string;
  detail: string;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;
const fmt = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
const unavailable = (detail: string): RawFactor => ({
  available: false,
  value: 0,
  homeDisplay: "—",
  awayDisplay: "—",
  detail,
});

function absenceImpact(list: MatchAvailability["home"]): number {
  if (!list) return 0;
  return list.absences.reduce((s, a) => {
    if (!a.confirmed) return s;
    return s + (a.status === "doubtful" ? 0.5 : 1);
  }, 0);
}

export function computeFactors(
  home: TeamProfile,
  away: TeamProfile,
  h2h: HeadToHeadMatch[],
  homeTeamId: string,
  availability: MatchAvailability,
  settings: ModelSettings,
): { factors: FactorContribution[]; edge: number; adjustmentEdge: number } {
  const raw: Record<FactorKey, RawFactor> = {
    form: home.sample >= 3 && away.sample >= 3
      ? {
          available: true,
          value: clamp((home.pointsPerMatchLast5 - away.pointsPerMatchLast5) / 3, -1, 1),
          homeDisplay: `${fmt(home.pointsPerMatchLast5)} pts/m`,
          awayDisplay: `${fmt(away.pointsPerMatchLast5)} pts/m`,
          detail: "Points par match sur les 5 derniers matchs.",
        }
      : unavailable("Moins de 3 matchs récents disponibles."),

    venue:
      home.venuePointsPerMatch !== null && away.venuePointsPerMatch !== null && home.venueSample >= 2 && away.venueSample >= 2
        ? {
            available: true,
            value: clamp((home.venuePointsPerMatch - away.venuePointsPerMatch) / 3, -1, 1),
            homeDisplay: `${fmt(home.venuePointsPerMatch)} pts/m à dom.`,
            awayDisplay: `${fmt(away.venuePointsPerMatch)} pts/m à l'ext.`,
            detail: `Points par match à domicile (${home.venueSample} m.) vs à l'extérieur (${away.venueSample} m.).`,
          }
        : unavailable("Échantillon domicile/extérieur insuffisant."),

    goals: home.sample >= 3 && away.sample >= 3
      ? {
          available: true,
          value: Math.tanh((home.goalsFor - home.goalsAgainst - (away.goalsFor - away.goalsAgainst)) / 2),
          homeDisplay: `${home.goalsFor - home.goalsAgainst >= 0 ? "+" : ""}${fmt(home.goalsFor - home.goalsAgainst)} /m`,
          awayDisplay: `${away.goalsFor - away.goalsAgainst >= 0 ? "+" : ""}${fmt(away.goalsFor - away.goalsAgainst)} /m`,
          detail: "Différence de buts moyenne par match (pondérée par récence).",
        }
      : unavailable("Moins de 3 matchs récents disponibles."),

    xg:
      home.xgFor !== null && away.xgFor !== null && home.xgAgainst !== null && away.xgAgainst !== null &&
      home.xgCoverage >= 0.6 && away.xgCoverage >= 0.6
        ? {
            available: true,
            value: Math.tanh((home.xgFor - home.xgAgainst - (away.xgFor - away.xgAgainst)) / 1.5),
            homeDisplay: `${fmt(home.xgFor)} xG / ${fmt(home.xgAgainst)} xGA`,
            awayDisplay: `${fmt(away.xgFor)} xG / ${fmt(away.xgAgainst)} xGA`,
            detail: "Différentiel xG – xGA par match.",
          }
        : unavailable("Données xG absentes ou partielles pour au moins une équipe."),

    defense: home.sample >= 3 && away.sample >= 3
      ? {
          available: true,
          value: Math.tanh((away.goalsAgainst - home.goalsAgainst) / 1.2),
          homeDisplay: `${fmt(home.goalsAgainst)} encaissés/m`,
          awayDisplay: `${fmt(away.goalsAgainst)} encaissés/m`,
          detail: `Buts encaissés par match. Clean sheets : ${pct(home.summary.cleanSheetRate)} vs ${pct(away.summary.cleanSheetRate)}.`,
        }
      : unavailable("Moins de 3 matchs récents disponibles."),

    h2h: (() => {
      if (h2h.length === 0) return unavailable("Aucune confrontation directe récente disponible.");
      let w = 0;
      let l = 0;
      for (const m of h2h) {
        const isHome = m.homeTeam.id === homeTeamId;
        const gf = isHome ? m.score.home : m.score.away;
        const ga = isHome ? m.score.away : m.score.home;
        if (gf > ga) w++;
        else if (gf < ga) l++;
      }
      const n = h2h.length;
      const d = n - w - l;
      // Rétrécissement : peu de confrontations = signal faible.
      const value = ((w - l) / n) * (n / (n + 3));
      return {
        available: true,
        value: clamp(value, -1, 1),
        homeDisplay: `${w} V`,
        awayDisplay: `${l} V`,
        detail: `${n} confrontation(s) : ${w} V / ${d} N / ${l} D pour l'équipe à domicile. Signal atténué car échantillon réduit.`,
      };
    })(),

    availability:
      availability.home === null && availability.away === null
        ? unavailable("Aucune donnée d'absence fournie par la source : aucune information n'est supposée.")
        : (() => {
            const ih = absenceImpact(availability.home);
            const ia = absenceImpact(availability.away);
            return {
              available: true,
              value: Math.tanh((ia - ih) / 4),
              homeDisplay: availability.home ? `${availability.home.absences.length} absence(s)` : "Non fourni",
              awayDisplay: availability.away ? `${availability.away.absences.length} absence(s)` : "Non fourni",
              detail: "Absences publiquement confirmées (blessures, suspensions). Les incertains comptent pour moitié.",
            };
          })(),

    schedule:
      home.restDays !== null && away.restDays !== null
        ? {
            available: true,
            value: clamp(
              Math.tanh((Math.min(home.restDays, 7) - Math.min(away.restDays, 7)) / 3) * 0.7 +
                Math.tanh((away.matchesLast14Days - home.matchesLast14Days) / 2) * 0.3,
              -1,
              1,
            ),
            homeDisplay: `${fmt(home.restDays, 1)} j de repos`,
            awayDisplay: `${fmt(away.restDays, 1)} j de repos`,
            detail: `Jours depuis le dernier match (plafonnés à 7) et matchs joués sur 14 jours (${home.matchesLast14Days} vs ${away.matchesLast14Days}).`,
          }
        : unavailable("Dates des derniers matchs indisponibles."),
  };

  const totalAvailableWeight = FACTOR_KEYS.reduce(
    (s, k) => s + (raw[k].available ? settings.weights[k] : 0),
    0,
  );
  const adjustingWeight = ADJUSTING_FACTORS.reduce((s, k) => s + (raw[k].available ? settings.weights[k] : 0), 0);

  let edge = 0;
  let adjustmentEdge = 0;
  const factors: FactorContribution[] = FACTOR_KEYS.map((key) => {
    const f = raw[key];
    const normalizedWeight = f.available && totalAvailableWeight > 0 ? settings.weights[key] / totalAvailableWeight : 0;
    const contribution = normalizedWeight * f.value;
    edge += contribution;
    if (f.available && ADJUSTING_FACTORS.includes(key) && adjustingWeight > 0) {
      adjustmentEdge += (settings.weights[key] / adjustingWeight) * f.value;
    }
    return {
      key,
      label: FACTOR_LABELS[key],
      weight: settings.weights[key],
      normalizedWeight: round(normalizedWeight, 4),
      available: f.available,
      value: round(f.value, 4),
      contribution: round(contribution, 4),
      homeDisplay: f.homeDisplay,
      awayDisplay: f.awayDisplay,
      detail: f.detail,
      adjustsExpectedGoals: ADJUSTING_FACTORS.includes(key),
    };
  });

  return { factors, edge: clamp(edge, -1, 1), adjustmentEdge: clamp(adjustmentEdge, -1, 1) };
}
