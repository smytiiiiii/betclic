import "server-only";
import { cache } from "react";
import { invalidate } from "@/lib/cache";
import { appSettingsSchema, type AppSettings } from "@/lib/domain/settings";
import { getRepository } from "@/lib/storage";

/** Paramètres courants (dédupliqués par requête React). */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const repo = await getRepository();
  return repo.getSettings();
});

export async function updateSettings(input: unknown): Promise<AppSettings> {
  const settings = appSettingsSchema.parse(input);
  const repo = await getRepository();
  const saved = await repo.saveSettings(settings);
  // Les analyses dépendent des paramètres du modèle.
  invalidate("analysis:");
  invalidate("backtest:");
  invalidate("opps:");
  return saved;
}
