import type {
  BankrollTransaction,
  Bet,
  BetInput,
  BetUpdate,
  TransactionInput,
} from "@/lib/domain/bankroll";
import type { AppSettings } from "@/lib/domain/settings";

/**
 * Persistance applicative (paramètres, paris, mouvements de bankroll).
 * Deux implémentations : fichier JSON local (par défaut) et PostgreSQL via Prisma.
 */
export interface Repository {
  readonly driver: "file" | "postgres";

  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;

  listBets(): Promise<Bet[]>;
  getBet(id: string): Promise<Bet | null>;
  createBet(input: BetInput): Promise<Bet>;
  updateBet(id: string, patch: BetUpdate): Promise<Bet | null>;
  deleteBet(id: string): Promise<boolean>;

  listTransactions(): Promise<BankrollTransaction[]>;
  createTransaction(input: TransactionInput): Promise<BankrollTransaction>;
  deleteTransaction(id: string): Promise<boolean>;

  /** Supprime tous les paris et mouvements (les paramètres sont conservés). */
  resetBankroll(): Promise<void>;
}
