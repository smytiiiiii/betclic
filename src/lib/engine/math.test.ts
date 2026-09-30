import { describe, expect, it } from "vitest";
import { negBinomialOver, poissonOver, poissonPmf, scoreMatrix, sumMatrix } from "./math";
import { compareWithOdds, impliedProbability } from "./value";
import { computeAccumulator } from "./accumulator";
import { brierScore, calibration } from "./evaluation";

describe("math", () => {
  it("poisson pmf sums to 1", () => {
    let s = 0;
    for (let k = 0; k < 30; k++) s += poissonPmf(k, 2.7);
    expect(s).toBeCloseTo(1, 8);
  });

  it("poissonOver matches complement of cdf", () => {
    const p = poissonOver(2.5, 2.5);
    const cdf = poissonPmf(0, 2.5) + poissonPmf(1, 2.5) + poissonPmf(2, 2.5);
    expect(p).toBeCloseTo(1 - cdf, 10);
  });

  it("score matrix is normalized and consistent", () => {
    const m = scoreMatrix(1.6, 1.1, -0.06);
    const total = sumMatrix(m, () => true);
    expect(total).toBeCloseTo(1, 8);
    const home = sumMatrix(m, (h, a) => h > a);
    const draw = sumMatrix(m, (h, a) => h === a);
    const away = sumMatrix(m, (h, a) => h < a);
    expect(home + draw + away).toBeCloseTo(1, 8);
    expect(home).toBeGreaterThan(away);
  });

  it("negative binomial approaches poisson with large dispersion", () => {
    expect(negBinomialOver(9.5, 10, 1e6)).toBeCloseTo(poissonOver(9.5, 10), 3);
  });
});

describe("value", () => {
  it("implied probability of 2.00 is 50%", () => {
    expect(impliedProbability(2)).toBe(0.5);
  });

  it("edge is model minus implied", () => {
    const cmp = compareWithOdds(0.6, "BTTS_YES", { BTTS_YES: 2, BTTS_NO: 1.8 });
    expect(cmp?.edgePoints).toBe(10);
    expect(cmp?.expectedValue).toBeCloseTo(0.2, 6);
    expect(cmp?.bookmakerMargin).toBeCloseTo(1 / 2 + 1 / 1.8 - 1, 4);
  });

  it("rejects invalid odds", () => {
    expect(() => impliedProbability(1)).toThrow();
  });
});

describe("accumulator", () => {
  const m = scoreMatrix(1.5, 1.1, 0);
  const pHome = sumMatrix(m, (h, a) => h > a);
  const pOver = sumMatrix(m, (h, a) => h + a >= 3);
  const pUnder = sumMatrix(m, (h, a) => h + a <= 2);

  it("uses the score matrix for same-match correlation", () => {
    const r = computeAccumulator([
      { matchId: "m1", matchLabel: "A-B", marketKey: "1X2_HOME", odds: 2, probability: pHome, scoreMatrix: m },
      { matchId: "m1", matchLabel: "A-B", marketKey: "OU_2_5_OVER", odds: 2, probability: pOver, scoreMatrix: m },
    ]);
    const joint = sumMatrix(m, (h, a) => h > a && h + a >= 3);
    expect(r.adjustedProbability).toBeCloseTo(joint, 4);
    expect(r.adjustedProbability).not.toBeCloseTo(r.naiveProbability, 3);
  });

  it("flags incompatible selections", () => {
    const r = computeAccumulator([
      { matchId: "m1", matchLabel: "A-B", marketKey: "OU_2_5_OVER", odds: 2, probability: pOver, scoreMatrix: m },
      { matchId: "m1", matchLabel: "A-B", marketKey: "OU_2_5_UNDER", odds: 2, probability: pUnder, scoreMatrix: m },
    ]);
    expect(r.adjustedProbability).toBe(0);
    expect(r.groups[0].incompatible).toBe(true);
  });

  it("multiplies independent matches", () => {
    const r = computeAccumulator([
      { matchId: "m1", matchLabel: "A-B", marketKey: "1X2_HOME", odds: 2, probability: 0.5, scoreMatrix: m },
      { matchId: "m2", matchLabel: "C-D", marketKey: "1X2_HOME", odds: 3, probability: 0.4, scoreMatrix: m },
    ]);
    expect(r.totalOdds).toBe(6);
    expect(r.adjustedProbability).toBeCloseTo(0.2, 6);
  });
});

describe("evaluation", () => {
  it("brier score is 0 for a perfect forecast", () => {
    expect(brierScore({ home: 1, draw: 0, away: 0 }, "H")).toBe(0);
  });

  it("calibration buckets", () => {
    const bins = calibration([
      { p: 0.55, hit: true },
      { p: 0.52, hit: false },
    ]);
    expect(bins).toHaveLength(1);
    expect(bins[0].observed).toBe(0.5);
  });
});
