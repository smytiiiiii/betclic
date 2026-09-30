/**
 * Moteur d'analyse statistique.
 *
 * Module pur, sans dépendance à Next.js, React ni à un fournisseur de
 * données : il reçoit des données normalisées (types de `lib/domain`) et
 * renvoie des estimations. Il peut être testé et réutilisé isolément
 * (worker, CLI, autre backend).
 */
export { analyzeMatch, goalMarketPredicate, goalMarketProbabilities, GOAL_MARKET_KEYS } from "./analyze";
export { computeAccumulator, riskLevel, RISK_LABELS } from "./accumulator";
export type { AccumulatorLegInput, AccumulatorResult, RiskLevel } from "./accumulator";
export { brierScore, calibration, logLoss, argmax } from "./evaluation";
export { compareWithOdds, impliedProbability, bookMargin, fairOdds } from "./value";
export { summarizeTeamRecords } from "./team-stats";
export * from "./types";
