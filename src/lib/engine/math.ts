/** Utilitaires mathématiques purs du moteur (sans dépendance). */

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const round = (v: number, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

const LOG_FACTORIALS: number[] = [0];
function logFactorial(n: number): number {
  for (let i = LOG_FACTORIALS.length; i <= n; i++) {
    LOG_FACTORIALS[i] = LOG_FACTORIALS[i - 1] + Math.log(i);
  }
  return LOG_FACTORIALS[n];
}

export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k));
}

/** P(X > line) pour X ~ Poisson(lambda), line = n + 0.5. */
export function poissonOver(line: number, lambda: number): number {
  const threshold = Math.floor(line);
  let cdf = 0;
  for (let k = 0; k <= threshold; k++) cdf += poissonPmf(k, lambda);
  return clamp(1 - cdf, 0, 1);
}

/**
 * Loi binomiale négative (paramétrée par moyenne et dispersion r) :
 * mieux adaptée que Poisson aux corners, surdispersés.
 */
export function negBinomialPmf(k: number, mean: number, r: number): number {
  const p = r / (r + mean);
  const logCoef = lgamma(k + r) - lgamma(r) - logFactorial(k);
  return Math.exp(logCoef + r * Math.log(p) + k * Math.log(1 - p));
}

export function negBinomialOver(line: number, mean: number, r: number): number {
  const threshold = Math.floor(line);
  let cdf = 0;
  for (let k = 0; k <= threshold; k++) cdf += negBinomialPmf(k, mean, r);
  return clamp(1 - cdf, 0, 1);
}

/** Approximation de Lanczos de ln Γ(x). */
export function lgamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Matrice des scores (probabilité de chaque score exact) selon un modèle de
 * Poisson indépendant corrigé par Dixon-Coles pour les scores faibles.
 * matrix[h][a] = P(domicile = h, extérieur = a).
 */
export function scoreMatrix(lambdaHome: number, lambdaAway: number, rho = 0, maxGoals = 10): number[][] {
  const matrix: number[][] = [];
  let total = 0;
  for (let h = 0; h <= maxGoals; h++) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a++) {
      let p = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
      p *= dixonColesTau(h, a, lambdaHome, lambdaAway, rho);
      p = Math.max(0, p);
      row.push(p);
      total += p;
    }
    matrix.push(row);
  }
  // Renormalisation : la troncature à maxGoals et la correction DC
  // modifient légèrement la masse totale.
  return matrix.map((row) => row.map((p) => p / total));
}

function dixonColesTau(h: number, a: number, lh: number, la: number, rho: number): number {
  if (rho === 0) return 1;
  if (h === 0 && a === 0) return 1 - lh * la * rho;
  if (h === 0 && a === 1) return 1 + lh * rho;
  if (h === 1 && a === 0) return 1 + la * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

/** Somme des cellules de la matrice satisfaisant un prédicat. */
export function sumMatrix(matrix: number[][], predicate: (h: number, a: number) => boolean): number {
  let s = 0;
  for (let h = 0; h < matrix.length; h++) {
    for (let a = 0; a < matrix[h].length; a++) {
      if (predicate(h, a)) s += matrix[h][a];
    }
  }
  return clamp(s, 0, 1);
}

/** Poids de récence exponentiels : le match i (0 = le plus récent). */
export function recencyWeights(n: number, halfLife: number): number[] {
  const decay = Math.log(2) / Math.max(halfLife, 0.5);
  return Array.from({ length: n }, (_, i) => Math.exp(-decay * i));
}

export function weightedMean(values: number[], weights: number[]): number | null {
  let s = 0;
  let w = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isFinite(v)) {
      s += v * weights[i];
      w += weights[i];
    }
  }
  return w > 0 ? s / w : null;
}

export function mean(values: number[]): number | null {
  const valid = values.filter(Number.isFinite);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Rétrécissement bayésien d'un ratio vers 1 selon la taille d'échantillon. */
export function shrinkRatio(ratio: number, n: number, priorStrength: number): number {
  return (ratio * n + 1 * priorStrength) / (n + priorStrength);
}
