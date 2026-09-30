import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type {
  BankrollTransaction,
  Bet,
  BetInput,
  BetUpdate,
  TransactionInput,
} from "@/lib/domain/bankroll";
import { withDefaults, type AppSettings } from "@/lib/domain/settings";
import type { Repository } from "./types";

type DbBet = Awaited<ReturnType<PrismaClient["bet"]["findFirstOrThrow"]>>;
type DbTx = Awaited<ReturnType<PrismaClient["bankrollTransaction"]["findFirstOrThrow"]>>;

const toDate = (d: string) => (d.length === 10 ? new Date(`${d}T12:00:00.000Z`) : new Date(d));

function mapBet(b: DbBet): Bet {
  return {
    id: b.id,
    createdAt: b.createdAt.toISOString(),
    placedAt: b.placedAt.toISOString(),
    matchId: b.matchId,
    matchLabel: b.matchLabel,
    competition: b.competition,
    marketKey: b.marketKey,
    selection: b.selection,
    odds: Number(b.odds),
    stake: Number(b.stake),
    status: b.status,
    modelProbability: b.modelProbability === null ? null : Number(b.modelProbability),
    notes: b.notes,
    settledAt: b.settledAt?.toISOString() ?? null,
  };
}

function mapTx(t: DbTx): BankrollTransaction {
  return {
    id: t.id,
    createdAt: t.createdAt.toISOString(),
    date: t.date.toISOString(),
    type: t.type,
    amount: Number(t.amount),
    note: t.note,
  };
}

const globalForPrisma = globalThis as unknown as { kairosPrisma?: PrismaClient };

/** Stockage PostgreSQL via Prisma (activé par DATABASE_URL). */
export class PrismaRepository implements Repository {
  readonly driver = "postgres" as const;
  private readonly db: PrismaClient;

  constructor(connectionString: string) {
    // Réutilise le client entre rechargements à chaud en développement.
    this.db = globalForPrisma.kairosPrisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    if (process.env.NODE_ENV !== "production") globalForPrisma.kairosPrisma = this.db;
  }

  async getSettings(): Promise<AppSettings> {
    const row = await this.db.appSettings.findUnique({ where: { id: 1 } });
    return withDefaults(row?.data);
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    await this.db.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, data: settings },
      update: { data: settings },
    });
    return settings;
  }

  async listBets(): Promise<Bet[]> {
    return (await this.db.bet.findMany({ orderBy: { placedAt: "desc" } })).map(mapBet);
  }

  async getBet(id: string): Promise<Bet | null> {
    const b = await this.db.bet.findUnique({ where: { id } });
    return b ? mapBet(b) : null;
  }

  async createBet(input: BetInput): Promise<Bet> {
    const b = await this.db.bet.create({
      data: {
        placedAt: toDate(input.placedAt),
        matchId: input.matchId ?? null,
        matchLabel: input.matchLabel,
        competition: input.competition ?? null,
        marketKey: input.marketKey ?? null,
        selection: input.selection,
        odds: input.odds,
        stake: input.stake,
        status: input.status,
        modelProbability: input.modelProbability ?? null,
        notes: input.notes ?? null,
        settledAt: input.status === "pending" ? null : new Date(),
      },
    });
    return mapBet(b);
  }

  async updateBet(id: string, patch: BetUpdate): Promise<Bet | null> {
    const current = await this.db.bet.findUnique({ where: { id } });
    if (!current) return null;
    const statusChanged = patch.status !== undefined && patch.status !== current.status;
    const b = await this.db.bet.update({
      where: { id },
      data: {
        status: patch.status,
        odds: patch.odds,
        stake: patch.stake,
        notes: patch.notes,
        ...(statusChanged ? { settledAt: patch.status === "pending" ? null : new Date() } : {}),
      },
    });
    return mapBet(b);
  }

  async deleteBet(id: string): Promise<boolean> {
    const r = await this.db.bet.deleteMany({ where: { id } });
    return r.count > 0;
  }

  async listTransactions(): Promise<BankrollTransaction[]> {
    return (await this.db.bankrollTransaction.findMany({ orderBy: { date: "desc" } })).map(mapTx);
  }

  async createTransaction(input: TransactionInput): Promise<BankrollTransaction> {
    const t = await this.db.bankrollTransaction.create({
      data: { date: toDate(input.date), type: input.type, amount: input.amount, note: input.note ?? null },
    });
    return mapTx(t);
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const r = await this.db.bankrollTransaction.deleteMany({ where: { id } });
    return r.count > 0;
  }

  async resetBankroll(): Promise<void> {
    await this.db.$transaction([this.db.bet.deleteMany(), this.db.bankrollTransaction.deleteMany()]);
  }
}
