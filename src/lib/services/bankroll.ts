import "server-only";
import {
  betInputSchema,
  betUpdateSchema,
  transactionInputSchema,
  type BankrollTransaction,
  type Bet,
} from "@/lib/domain/bankroll";
import { getRepository } from "@/lib/storage";
import { checkStake, summarizeBankroll, type BankrollSummary, type StakeCheck } from "./bankroll-math";
import { getSettings } from "./settings";

export interface BankrollState {
  bets: Bet[];
  transactions: BankrollTransaction[];
  summary: BankrollSummary;
}

export async function getBankrollState(): Promise<BankrollState> {
  const repo = await getRepository();
  const [bets, transactions, settings] = await Promise.all([repo.listBets(), repo.listTransactions(), getSettings()]);
  return { bets, transactions, summary: summarizeBankroll(bets, transactions, settings.bankroll) };
}

export class LimitExceededError extends Error {
  readonly status = 422;
  constructor(readonly check: StakeCheck) {
    super(check.messages.join(" "));
    this.name = "LimitExceededError";
  }
}

export async function createBet(input: unknown) {
  const data = betInputSchema.parse(input);
  const settings = await getSettings();
  const { summary } = await getBankrollState();
  const check = checkStake(data.stake, summary.balance, settings.bankroll, summary);
  // Limites strictes : on bloque les mises dépassant les limites de perte.
  if (settings.bankroll.hardLimits && (check.exceedsDailyLimit || check.exceedsWeeklyLimit || summary.daily.exceeded || summary.weekly.exceeded)) {
    throw new LimitExceededError(check);
  }
  const repo = await getRepository();
  const bet = await repo.createBet(data);
  return { bet, check };
}

export async function updateBet(id: string, input: unknown) {
  const patch = betUpdateSchema.parse(input);
  const repo = await getRepository();
  return repo.updateBet(id, patch);
}

export async function deleteBet(id: string) {
  const repo = await getRepository();
  return repo.deleteBet(id);
}

export async function createTransaction(input: unknown) {
  const data = transactionInputSchema.parse(input);
  const repo = await getRepository();
  return repo.createTransaction(data);
}

export async function deleteTransaction(id: string) {
  const repo = await getRepository();
  return repo.deleteTransaction(id);
}

export async function resetBankroll() {
  const repo = await getRepository();
  await repo.resetBankroll();
}
