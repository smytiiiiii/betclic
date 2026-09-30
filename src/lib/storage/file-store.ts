import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BankrollTransaction, Bet, BetInput, BetUpdate, TransactionInput } from "@/lib/domain/bankroll";
import { withDefaults, type AppSettings } from "@/lib/domain/settings";
import type { Repository } from "./types";

interface FileData {
  version: 1;
  settings: AppSettings;
  bets: Bet[];
  transactions: BankrollTransaction[];
}

const toIso = (d: string) => (d.length === 10 ? new Date(`${d}T12:00:00.000Z`).toISOString() : new Date(d).toISOString());

/**
 * Stockage dans un fichier JSON local (DATA_DIR/kairos.json).
 * Écritures atomiques (fichier temporaire + rename) et sérialisées.
 * Adapté à un usage local mono-utilisateur ; utilisez PostgreSQL en production.
 */
export class FileRepository implements Repository {
  readonly driver = "file" as const;
  private readonly file: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.file = path.resolve(process.cwd(), dataDir, "kairos.json");
  }

  private async read(): Promise<FileData> {
    try {
      const raw = JSON.parse(await readFile(this.file, "utf8")) as Partial<FileData>;
      return {
        version: 1,
        settings: withDefaults(raw.settings),
        bets: Array.isArray(raw.bets) ? raw.bets : [],
        transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 1, settings: withDefaults({}), bets: [], transactions: [] };
      }
      throw err;
    }
  }

  private async write(data: FileData) {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await rename(tmp, this.file);
  }

  /** Sérialise les mutations pour éviter les écritures concurrentes. */
  private mutate<T>(fn: (data: FileData) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.write(data);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async getSettings() {
    return (await this.read()).settings;
  }

  saveSettings(settings: AppSettings) {
    return this.mutate((d) => {
      d.settings = settings;
      return settings;
    });
  }

  async listBets() {
    return (await this.read()).bets.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  async getBet(id: string) {
    return (await this.read()).bets.find((b) => b.id === id) ?? null;
  }

  createBet(input: BetInput) {
    return this.mutate((d) => {
      const now = new Date().toISOString();
      const bet: Bet = {
        id: randomUUID(),
        createdAt: now,
        placedAt: toIso(input.placedAt),
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
        settledAt: input.status === "pending" ? null : now,
      };
      d.bets.push(bet);
      return bet;
    });
  }

  updateBet(id: string, patch: BetUpdate) {
    return this.mutate((d) => {
      const bet = d.bets.find((b) => b.id === id);
      if (!bet) return null;
      if (patch.status && patch.status !== bet.status) {
        bet.settledAt = patch.status === "pending" ? null : new Date().toISOString();
        bet.status = patch.status;
      }
      if (patch.odds !== undefined) bet.odds = patch.odds;
      if (patch.stake !== undefined) bet.stake = patch.stake;
      if (patch.notes !== undefined) bet.notes = patch.notes;
      return { ...bet };
    });
  }

  deleteBet(id: string) {
    return this.mutate((d) => {
      const before = d.bets.length;
      d.bets = d.bets.filter((b) => b.id !== id);
      return d.bets.length < before;
    });
  }

  async listTransactions() {
    return (await this.read()).transactions.sort((a, b) => b.date.localeCompare(a.date));
  }

  createTransaction(input: TransactionInput) {
    return this.mutate((d) => {
      const tx: BankrollTransaction = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        date: toIso(input.date),
        type: input.type,
        amount: input.amount,
        note: input.note ?? null,
      };
      d.transactions.push(tx);
      return tx;
    });
  }

  deleteTransaction(id: string) {
    return this.mutate((d) => {
      const before = d.transactions.length;
      d.transactions = d.transactions.filter((t) => t.id !== id);
      return d.transactions.length < before;
    });
  }

  resetBankroll() {
    return this.mutate((d) => {
      d.bets = [];
      d.transactions = [];
    });
  }
}
