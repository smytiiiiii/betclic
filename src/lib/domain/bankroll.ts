import { z } from "zod";
import { MARKET_KEYS } from "./types";

export const BET_STATUSES = ["pending", "won", "lost", "void"] as const;
export type BetStatus = (typeof BET_STATUSES)[number];

export const BET_STATUS_LABELS: Record<BetStatus, string> = {
  pending: "En cours",
  won: "Gagné",
  lost: "Perdu",
  void: "Remboursé",
};

export interface Bet {
  id: string;
  createdAt: string;
  /** Date de la mise (ISO). */
  placedAt: string;
  matchId: string | null;
  matchLabel: string;
  competition: string | null;
  marketKey: string | null;
  selection: string;
  odds: number;
  stake: number;
  status: BetStatus;
  /** Probabilité estimée par le modèle au moment de la mise (0-1). */
  modelProbability: number | null;
  notes: string | null;
  settledAt: string | null;
}

export const betInputSchema = z.object({
  placedAt: z.union([z.iso.datetime({ offset: true }), z.iso.date()], { error: "Date invalide" }),
  matchId: z.string().max(120).nullable().optional(),
  matchLabel: z.string().trim().min(2, "Libellé du match requis").max(160),
  competition: z.string().trim().max(120).nullable().optional(),
  marketKey: z.enum(MARKET_KEYS).nullable().optional(),
  selection: z.string().trim().min(1, "Sélection requise").max(160),
  odds: z.number().min(1.01, "Cote minimale : 1.01").max(1000),
  stake: z.number().positive("La mise doit être positive").max(1_000_000),
  status: z.enum(BET_STATUSES).default("pending"),
  modelProbability: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type BetInput = z.infer<typeof betInputSchema>;

export const betUpdateSchema = z.object({
  status: z.enum(BET_STATUSES).optional(),
  odds: z.number().min(1.01).max(1000).optional(),
  stake: z.number().positive().max(1_000_000).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type BetUpdate = z.infer<typeof betUpdateSchema>;

export const TRANSACTION_TYPES = ["deposit", "withdrawal"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface BankrollTransaction {
  id: string;
  createdAt: string;
  date: string;
  type: TransactionType;
  amount: number;
  note: string | null;
}

export const transactionInputSchema = z.object({
  date: z.union([z.iso.datetime({ offset: true }), z.iso.date()], { error: "Date invalide" }),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive("Montant positif requis").max(10_000_000),
  note: z.string().trim().max(200).nullable().optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

/** Gain/perte net d'une mise réglée (0 pour une mise en cours). */
export function betProfit(bet: Pick<Bet, "status" | "odds" | "stake">): number {
  switch (bet.status) {
    case "won":
      return bet.stake * (bet.odds - 1);
    case "lost":
      return -bet.stake;
    default:
      return 0;
  }
}
