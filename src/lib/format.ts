/** Formatage (fr-FR) partagé serveur/client, fuseau horaire explicite. */
import { DEFAULT_TIMEZONE } from "./time";

const nf = (min: number, max: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: min, maximumFractionDigits: max });
const NF0 = nf(0, 0);
const NF1 = nf(1, 1);
const NF2 = nf(2, 2);

/** 0.6423 → « 64 % » (ou « 64,2 % » avec digits=1). */
export function formatPercent(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const val = v * 100;
  return `${digits === 0 ? NF0.format(val) : digits === 1 ? NF1.format(val) : NF2.format(val)} %`;
}

/** Écart en points de pourcentage : 0.1 → « +10,0 pts ». */
export function formatEdge(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const val = v * 100;
  const s = digits === 0 ? NF0.format(Math.abs(val)) : NF1.format(Math.abs(val));
  return `${val > 0 ? "+" : val < 0 ? "−" : ""}${s} pts`;
}

export function formatOdds(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return NF2.format(v);
}

export function formatNumber(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return nf(digits, digits).format(v);
}

export function formatInteger(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return NF0.format(v);
}

export function formatCurrency(v: number | null | undefined, currency = "EUR", signed = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = new Intl.NumberFormat("fr-FR", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
  if (!signed) return v < 0 ? `−${s}` : s;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${s}`;
}

export function formatUnits(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${NF2.format(Math.abs(v))} u`;
}

export function formatTime(iso: string, tz = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDate(iso: string, tz = DEFAULT_TIMEZONE, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, ...opts }).format(new Date(iso));
}

export function formatDateTime(iso: string, tz = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Libellé d'une journée YYYY-MM-DD (« Aujourd'hui », « Demain », « mer. 2 oct. »). */
export function formatDayKey(dayKey: string, todayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const diff = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export const RESULT_LABEL: Record<"W" | "D" | "L", string> = { W: "V", D: "N", L: "D" };
