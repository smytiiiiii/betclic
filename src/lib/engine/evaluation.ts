import { round } from "./math";

export type Outcome1X2 = "H" | "D" | "A";

export interface ProbabilityTriplet {
  home: number;
  draw: number;
  away: number;
}

/** Score de Brier multi-classes (0 = parfait, plus bas = meilleur). */
export function brierScore(p: ProbabilityTriplet, outcome: Outcome1X2): number {
  const o = { home: outcome === "H" ? 1 : 0, draw: outcome === "D" ? 1 : 0, away: outcome === "A" ? 1 : 0 };
  return (p.home - o.home) ** 2 + (p.draw - o.draw) ** 2 + (p.away - o.away) ** 2;
}

export function logLoss(p: ProbabilityTriplet, outcome: Outcome1X2): number {
  const v = outcome === "H" ? p.home : outcome === "D" ? p.draw : p.away;
  return -Math.log(Math.max(v, 1e-9));
}

export function argmax(p: ProbabilityTriplet): Outcome1X2 {
  if (p.home >= p.draw && p.home >= p.away) return "H";
  if (p.away >= p.draw) return "A";
  return "D";
}

export interface CalibrationBin {
  /** Borne basse du groupe (ex. 0.3 pour 30-40 %). */
  bucket: number;
  label: string;
  predicted: number;
  observed: number;
  count: number;
}

/** Courbe de calibration : fréquence observée vs probabilité prédite. */
export function calibration(points: { p: number; hit: boolean }[], bins = 10): CalibrationBin[] {
  const acc = Array.from({ length: bins }, () => ({ sumP: 0, hits: 0, n: 0 }));
  for (const { p, hit } of points) {
    const i = Math.min(bins - 1, Math.floor(p * bins));
    acc[i].sumP += p;
    acc[i].hits += hit ? 1 : 0;
    acc[i].n += 1;
  }
  return acc
    .map((b, i) => ({
      bucket: i / bins,
      label: `${Math.round((i / bins) * 100)}-${Math.round(((i + 1) / bins) * 100)} %`,
      predicted: b.n ? round(b.sumP / b.n, 4) : 0,
      observed: b.n ? round(b.hits / b.n, 4) : 0,
      count: b.n,
    }))
    .filter((b) => b.count > 0);
}
