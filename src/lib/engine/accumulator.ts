import { MARKETS } from "@/lib/domain/markets";
import type { MarketKey } from "@/lib/domain/types";
import { goalMarketPredicate } from "./analyze";
import { round, sumMatrix } from "./math";

export interface AccumulatorLegInput {
  matchId: string;
  matchLabel: string;
  marketKey: MarketKey;
  /** Cote proposée pour la sélection (null si aucune source). */
  odds: number | null;
  /** Probabilité estimée isolément par le modèle. */
  probability: number;
  /** Matrice des scores du match (nécessaire pour les corrélations intra-match). */
  scoreMatrix: number[][];
}

export type RiskLevel = "moderate" | "high" | "very_high" | "extreme";

export const RISK_LABELS: Record<RiskLevel, string> = {
  moderate: "Modéré",
  high: "Élevé",
  very_high: "Très élevé",
  extreme: "Extrême",
};

export interface AccumulatorMatchGroup {
  matchId: string;
  matchLabel: string;
  legs: MarketKey[];
  /** Produit naïf des probabilités de ce match. */
  naiveProbability: number;
  /** Probabilité jointe calculée sur la matrice des scores (corrélations incluses). */
  jointProbability: number;
  /** Méthode utilisée pour la probabilité jointe. */
  method: "single" | "score_matrix" | "independent";
  incompatible: boolean;
  note: string | null;
}

export interface AccumulatorResult {
  selections: number;
  totalOdds: number | null;
  /** Produit naïf de toutes les probabilités (suppose l'indépendance totale). */
  naiveProbability: number;
  /** Approximation corrigée des corrélations intra-match (indépendance entre matchs). */
  adjustedProbability: number;
  impliedProbability: number | null;
  /** Écart entre probabilité ajustée et probabilité implicite de la cote totale. */
  edge: number | null;
  expectedValue: number | null;
  risk: RiskLevel;
  groups: AccumulatorMatchGroup[];
  warnings: string[];
}

export function riskLevel(p: number): RiskLevel {
  if (p >= 0.4) return "moderate";
  if (p >= 0.2) return "high";
  if (p >= 0.08) return "very_high";
  return "extreme";
}

/**
 * Calcule une approximation de la probabilité d'un combiné.
 *
 * - Sélections d'un même match : si toutes portent sur les buts, la
 *   probabilité jointe est calculée exactement sur la matrice des scores
 *   (ex. « Victoire domicile + Over 2.5 » sont corrélés). Sinon, on revient
 *   à l'indépendance et on le signale.
 * - Sélections de matchs différents : indépendance supposée (approximation).
 */
export function computeAccumulator(legs: AccumulatorLegInput[]): AccumulatorResult {
  const warnings: string[] = [];
  const byMatch = new Map<string, AccumulatorLegInput[]>();
  for (const leg of legs) {
    const list = byMatch.get(leg.matchId) ?? [];
    list.push(leg);
    byMatch.set(leg.matchId, list);
  }

  const groups: AccumulatorMatchGroup[] = [];
  for (const [matchId, list] of byMatch) {
    const naive = list.reduce((p, l) => p * l.probability, 1);
    if (list.length === 1) {
      groups.push({
        matchId,
        matchLabel: list[0].matchLabel,
        legs: [list[0].marketKey],
        naiveProbability: naive,
        jointProbability: list[0].probability,
        method: "single",
        incompatible: false,
        note: null,
      });
      continue;
    }
    const predicates = list.map((l) => goalMarketPredicate(l.marketKey));
    let joint: number;
    let method: AccumulatorMatchGroup["method"];
    let note: string;
    if (predicates.every((p) => p !== null)) {
      joint = sumMatrix(list[0].scoreMatrix, (h, a) => predicates.every((p) => p!(h, a)));
      method = "score_matrix";
      note =
        joint < naive
          ? "Sélections négativement corrélées : la probabilité jointe est inférieure au produit naïf."
          : joint > naive
            ? "Sélections positivement corrélées : la probabilité jointe est supérieure au produit naïf."
            : "Sélections quasi indépendantes.";
    } else {
      joint = naive;
      method = "independent";
      note = "Corrélation non modélisée (marché corners) : indépendance supposée, approximation grossière.";
      warnings.push(`${list[0].matchLabel} : corrélation entre corners et buts non modélisée.`);
    }
    const incompatible = joint < 1e-6;
    if (incompatible) warnings.push(`${list[0].matchLabel} : sélections incompatibles (${list.map((l) => MARKETS[l.marketKey].label).join(" + ")}).`);
    groups.push({
      matchId,
      matchLabel: list[0].matchLabel,
      legs: list.map((l) => l.marketKey),
      naiveProbability: naive,
      jointProbability: joint,
      method,
      incompatible,
      note,
    });
  }

  if ([...byMatch.values()].some((l) => l.length > 1)) {
    warnings.push(
      "Plusieurs sélections sur un même match : de nombreux opérateurs les refusent ou les tarifient différemment (cote non multiplicative).",
    );
  }

  const naiveProbability = legs.reduce((p, l) => p * l.probability, 1);
  const adjustedProbability = groups.reduce((p, g) => p * g.jointProbability, 1);
  const allOdds = legs.every((l) => l.odds !== null && l.odds > 1);
  const totalOdds = allOdds && legs.length ? legs.reduce((o, l) => o * (l.odds as number), 1) : null;
  const implied = totalOdds ? 1 / totalOdds : null;

  if (legs.length > 1) {
    warnings.push(
      "La probabilité entre matchs différents suppose l'indépendance : c'est une approximation, pas une garantie.",
    );
  }
  if (!allOdds && legs.length) warnings.push("Une ou plusieurs sélections n'ont pas de cote disponible : cote totale non calculable.");

  return {
    selections: legs.length,
    totalOdds: totalOdds !== null ? round(totalOdds, 2) : null,
    naiveProbability: round(naiveProbability, 5),
    adjustedProbability: round(adjustedProbability, 5),
    impliedProbability: implied !== null ? round(implied, 5) : null,
    edge: implied !== null ? round(adjustedProbability - implied, 5) : null,
    expectedValue: totalOdds !== null ? round(adjustedProbability * totalOdds - 1, 4) : null,
    risk: riskLevel(adjustedProbability),
    groups: groups.map((g) => ({
      ...g,
      naiveProbability: round(g.naiveProbability, 5),
      jointProbability: round(g.jointProbability, 5),
    })),
    warnings,
  };
}
