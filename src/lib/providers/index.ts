import "server-only";
import { env } from "@/lib/config/env";
import { ApiFootballProvider } from "./api-football/provider";
import { MockSportDataProvider } from "./mock/provider";
import type { SportDataProvider } from "./types";

let instance: SportDataProvider | null = null;

/**
 * Point d'entrée unique vers la source de données.
 *
 * - `SPORTS_API_PROVIDER=api-football` + `SPORTS_API_KEY` → API réelle.
 * - Sinon → provider de démonstration (données fictives, clairement étiquetées).
 *
 * Pour ajouter un fournisseur : implémenter `SportDataProvider` puis
 * l'enregistrer ici.
 */
export function getProvider(): SportDataProvider {
  if (instance) return instance;
  const e = env();
  if (e.SPORTS_API_PROVIDER === "api-football" && e.SPORTS_API_KEY) {
    instance = new ApiFootballProvider({
      apiKey: e.SPORTS_API_KEY,
      baseUrl: e.SPORTS_API_URL ?? "https://v3.football.api-sports.io",
      leagues: (e.SPORTS_API_LEAGUES ?? "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0),
      season: e.SPORTS_API_SEASON ?? new Date().getUTCFullYear(),
      bookmakerId: e.SPORTS_API_BOOKMAKER,
      cacheSeconds: e.SPORTS_API_CACHE_SECONDS,
    });
  } else {
    instance = new MockSportDataProvider();
  }
  return instance;
}

export type { SportDataProvider, MatchQuery, HistoryOptions } from "./types";
export { ProviderError } from "./types";
