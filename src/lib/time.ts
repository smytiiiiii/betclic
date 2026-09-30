/** Utilitaires de dates avec fuseau horaire explicite (identiques serveur/client). */

export const DEFAULT_TIMEZONE = "Europe/Paris";

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Décalage (ms) du fuseau par rapport à UTC à un instant donné. */
function offsetMs(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Date locale (YYYY-MM-DD) d'un instant dans un fuseau. */
export function localDateKey(date: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  const p = partsInZone(typeof date === "string" ? new Date(date) : date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Heure locale (0-23) d'un instant dans un fuseau. */
export function localHour(date: Date | string, timeZone = DEFAULT_TIMEZONE): number {
  return partsInZone(typeof date === "string" ? new Date(date) : date, timeZone).hour;
}

/** Bornes UTC [début, fin[ d'une journée locale YYYY-MM-DD. */
export function zonedDayRange(dayKey: string, timeZone = DEFAULT_TIMEZONE): { start: Date; end: Date } {
  const [y, m, d] = dayKey.split("-").map(Number);
  const guessStart = new Date(Date.UTC(y, m - 1, d));
  const start = new Date(guessStart.getTime() - offsetMs(guessStart, timeZone));
  const guessEnd = new Date(Date.UTC(y, m - 1, d + 1));
  const end = new Date(guessEnd.getTime() - offsetMs(guessEnd, timeZone));
  return { start, end };
}

export function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export const isDayKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
