import { MARKETS } from "@/lib/domain/markets";
import type { MarketKey } from "@/lib/domain/types";
import { round } from "./math";

/** Probabilité implicite d'une cote décimale : 1 / cote. */
export function impliedProbability(odds: number): number {
  if (!Number.isFinite(odds) || odds <= 1) throw new RangeError("Une cote décimale doit être > 1");
  return 1 / odds;
}

/**
 * Marge du bookmaker sur un ensemble exhaustif de marchés (overround - 1).
 * Renvoie null si une cote de l'ensemble manque.
 */
export function bookMargin(key: MarketKey, odds: Partial<Record<MarketKey, number>>): number | null {
  const book = MARKETS[key].book;
  if (!book) return null;
  let sum = 0;
  for (const k of book) {
    const o = odds[k];
    if (!o || o <= 1) return null;
    sum += 1 / o;
  }
  return sum - 1;
}

export interface ValueComparison {
  odds: number;
  impliedProbability: number;
  fairImpliedProbability: number | null;
  bookmakerMargin: number | null;
  /** Écart statistique (fraction) : probabilité modèle - probabilité implicite. */
  edge: number;
  /** Écart exprimé en points de pourcentage. */
  edgePoints: number;
  expectedValue: number;
}

export function compareWithOdds(
  modelProbability: number,
  key: MarketKey,
  odds: Partial<Record<MarketKey, number>>,
): ValueComparison | null {
  const o = odds[key];
  if (!o || o <= 1) return null;
  const implied = impliedProbability(o);
  const margin = bookMargin(key, odds);
  const fair = margin !== null ? implied / (1 + margin) : null;
  const edge = modelProbability - implied;
  return {
    odds: o,
    impliedProbability: round(implied, 4),
    fairImpliedProbability: fair !== null ? round(fair, 4) : null,
    bookmakerMargin: margin !== null ? round(margin, 4) : null,
    edge: round(edge, 4),
    edgePoints: round(edge * 100, 1),
    expectedValue: round(modelProbability * o - 1, 4),
  };
}

/** Cote « juste » correspondant à une probabilité (sans marge). */
export const fairOdds = (p: number) => (p > 0 ? round(1 / p, 2) : Infinity);
