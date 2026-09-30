/**
 * Calculs de bankroll purs (partagés serveur/client) : solde, ROI,
 * séries, limites de jeu responsable.
 */
import { betProfit, type BankrollTransaction, type Bet } from "@/lib/domain/bankroll";
import type { BankrollSettings } from "@/lib/domain/settings";

const DAY = 86_400_000;
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface LimitStatus {
  limit: number;
  /** Pertes nettes sur la période (positif = perte). */
  loss: number;
  remaining: number | null;
  exceeded: boolean;
  enabled: boolean;
}

export interface BankrollSummary {
  initial: number;
  deposits: number;
  withdrawals: number;
  settledProfit: number;
  pendingStake: number;
  pendingCount: number;
  balance: number;
  totalStaked: number;
  roi: number | null;
  winRate: number | null;
  counts: { won: number; lost: number; void: number; pending: number; total: number };
  averageOdds: number | null;
  biggestWin: number;
  biggestLoss: number;
  streak: { type: "won" | "lost" | null; length: number };
  series: { date: string; balance: number; cumulativeProfit: number }[];
  daily: LimitStatus;
  weekly: LimitStatus;
}

function limitStatus(bets: Bet[], limit: number, sinceTs: number): LimitStatus {
  const loss = -bets
    .filter((b) => b.status !== "pending" && new Date(b.settledAt ?? b.placedAt).getTime() >= sinceTs)
    .reduce((s, b) => s + betProfit(b), 0);
  const enabled = limit > 0;
  return {
    limit,
    loss: r2(Math.max(0, loss)),
    remaining: enabled ? r2(Math.max(0, limit - Math.max(0, loss))) : null,
    exceeded: enabled && loss >= limit,
    enabled,
  };
}

export function summarizeBankroll(
  bets: Bet[],
  transactions: BankrollTransaction[],
  settings: BankrollSettings,
  now = new Date(),
): BankrollSummary {
  const settled = bets.filter((b) => b.status !== "pending");
  const decided = bets.filter((b) => b.status === "won" || b.status === "lost");
  const pending = bets.filter((b) => b.status === "pending");
  const deposits = transactions.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const withdrawals = transactions.filter((t) => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0);
  const settledProfit = settled.reduce((s, b) => s + betProfit(b), 0);
  const pendingStake = pending.reduce((s, b) => s + b.stake, 0);
  const totalStaked = decided.reduce((s, b) => s + b.stake, 0);
  const won = bets.filter((b) => b.status === "won").length;
  const lost = bets.filter((b) => b.status === "lost").length;

  // Série chronologique : mouvements + paris réglés.
  type Evt = { ts: number; delta: number; profit: number };
  const events: Evt[] = [
    ...transactions.map((t) => ({ ts: new Date(t.date).getTime(), delta: t.type === "deposit" ? t.amount : -t.amount, profit: 0 })),
    ...settled.map((b) => {
      const p = betProfit(b);
      return { ts: new Date(b.settledAt ?? b.placedAt).getTime(), delta: p, profit: p };
    }),
  ].sort((a, b) => a.ts - b.ts);
  let balance = settings.initialBankroll;
  let cumulativeProfit = 0;
  const series: BankrollSummary["series"] = [];
  const firstTs = events[0]?.ts ?? now.getTime();
  series.push({ date: new Date(firstTs - DAY).toISOString(), balance: r2(balance), cumulativeProfit: 0 });
  for (const e of events) {
    balance += e.delta;
    cumulativeProfit += e.profit;
    series.push({ date: new Date(e.ts).toISOString(), balance: r2(balance), cumulativeProfit: r2(cumulativeProfit) });
  }

  // Série en cours (paris réglés les plus récents).
  const chronological = decided.slice().sort((a, b) => (b.settledAt ?? b.placedAt).localeCompare(a.settledAt ?? a.placedAt));
  let streakType: "won" | "lost" | null = null;
  let streakLength = 0;
  for (const b of chronological) {
    if (streakType === null) streakType = b.status as "won" | "lost";
    if (b.status !== streakType) break;
    streakLength++;
  }

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const profits = settled.map(betProfit);

  return {
    initial: settings.initialBankroll,
    deposits: r2(deposits),
    withdrawals: r2(withdrawals),
    settledProfit: r2(settledProfit),
    pendingStake: r2(pendingStake),
    pendingCount: pending.length,
    balance: r2(settings.initialBankroll + deposits - withdrawals + settledProfit - pendingStake),
    totalStaked: r2(totalStaked),
    roi: totalStaked > 0 ? settledProfit / totalStaked : null,
    winRate: won + lost > 0 ? won / (won + lost) : null,
    counts: { won, lost, void: bets.filter((b) => b.status === "void").length, pending: pending.length, total: bets.length },
    averageOdds: bets.length ? r2(bets.reduce((s, b) => s + b.odds, 0) / bets.length) : null,
    biggestWin: r2(Math.max(0, ...profits)),
    biggestLoss: r2(Math.min(0, ...profits)),
    streak: { type: streakType, length: streakLength },
    series,
    daily: limitStatus(bets, settings.dailyLossLimit, startOfDay.getTime()),
    weekly: limitStatus(bets, settings.weeklyLossLimit, now.getTime() - 7 * DAY),
  };
}

export type StakeLevel = "ok" | "caution" | "high";

export interface StakeCheck {
  pctOfBankroll: number | null;
  level: StakeLevel;
  exceedsThreshold: boolean;
  exceedsDailyLimit: boolean;
  exceedsWeeklyLimit: boolean;
  messages: string[];
}

/** Vérifie une mise au regard de la bankroll et des limites configurées. */
export function checkStake(
  stake: number,
  bankroll: number,
  settings: BankrollSettings,
  limits?: { daily: LimitStatus; weekly: LimitStatus },
): StakeCheck {
  const messages: string[] = [];
  const pct = bankroll > 0 ? stake / bankroll : null;
  const threshold = settings.maxStakePct / 100;
  let level: StakeLevel = "ok";
  if (pct === null) {
    level = "high";
    messages.push("Bankroll nulle ou négative : aucune mise n'est recommandée.");
  } else if (pct > threshold) {
    level = "high";
    messages.push(
      `Cette mise représente ${(pct * 100).toFixed(1).replace(".", ",")} % de votre bankroll, au-delà de votre seuil de ${settings.maxStakePct} %.`,
    );
  } else if (pct > threshold * 0.6) {
    level = "caution";
    messages.push("Mise proche de votre seuil d'alerte.");
  }
  if (stake > bankroll && bankroll > 0) messages.push("La mise dépasse le solde disponible.");
  const exceedsDailyLimit = Boolean(limits?.daily.enabled && limits.daily.remaining !== null && stake > limits.daily.remaining);
  const exceedsWeeklyLimit = Boolean(limits?.weekly.enabled && limits.weekly.remaining !== null && stake > limits.weekly.remaining);
  if (exceedsDailyLimit) messages.push("Une perte de cette mise dépasserait votre limite de perte journalière.");
  if (exceedsWeeklyLimit) messages.push("Une perte de cette mise dépasserait votre limite de perte hebdomadaire.");
  if (exceedsDailyLimit || exceedsWeeklyLimit) level = "high";
  return {
    pctOfBankroll: pct,
    level,
    exceedsThreshold: pct !== null && pct > threshold,
    exceedsDailyLimit,
    exceedsWeeklyLimit,
    messages,
  };
}
