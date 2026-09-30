import "server-only";
import { z } from "zod";

/**
 * Configuration serveur. Lue UNIQUEMENT côté serveur : aucune de ces
 * variables n'est préfixée par NEXT_PUBLIC_, elles ne sont donc jamais
 * embarquées dans le bundle client.
 */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- API sportive --------------------------------------------------------
  SPORTS_API_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["api-football", "demo"]).optional()),
  SPORTS_API_KEY: optionalString,
  SPORTS_API_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  SPORTS_API_LEAGUES: optionalString,
  SPORTS_API_SEASON: z.preprocess(emptyToUndefined, z.coerce.number().int().min(2000).max(2100).optional()),
  SPORTS_API_BOOKMAKER: z.preprocess(emptyToUndefined, z.coerce.number().int().optional()),
  SPORTS_API_CACHE_SECONDS: z.coerce.number().int().min(0).max(86_400).default(300),

  // --- IA explicative ------------------------------------------------------
  ANTHROPIC_API_KEY: optionalString,
  LLM_MODEL: z.preprocess(emptyToUndefined, z.string().default("claude-opus-5-5")),
  LLM_EFFORT: z.preprocess(emptyToUndefined, z.enum(["low", "medium", "high"]).default("low")),

  // --- Stockage ------------------------------------------------------------
  DATABASE_URL: optionalString,
  STORAGE_DRIVER: z.preprocess(emptyToUndefined, z.enum(["file", "postgres"]).optional()),
  DATA_DIR: z.preprocess(emptyToUndefined, z.string().default(".data")),

  // --- Sécurité ------------------------------------------------------------
  APP_ACCESS_PASSWORD: optionalString,
  APP_SESSION_SECRET: optionalString,

  // --- Divers --------------------------------------------------------------
  APP_TIMEZONE: z.preprocess(emptyToUndefined, z.string().default("Europe/Paris")),
  LIVE_POLL_INTERVAL_SECONDS: z.coerce.number().int().min(5).max(300).default(15),
  BACKTEST_DAYS: z.coerce.number().int().min(7).max(180).default(45),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuration invalide (.env.local) : ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Informations de configuration non sensibles, exposables à l'interface. */
export function publicConfig() {
  const e = env();
  return {
    timezone: e.APP_TIMEZONE,
    llmConfigured: Boolean(e.ANTHROPIC_API_KEY),
    llmModel: e.ANTHROPIC_API_KEY ? e.LLM_MODEL : null,
    storageDriver: storageDriver(),
    authEnabled: Boolean(e.APP_ACCESS_PASSWORD),
    livePollSeconds: e.LIVE_POLL_INTERVAL_SECONDS,
  };
}

export function storageDriver(): "file" | "postgres" {
  const e = env();
  if (e.STORAGE_DRIVER) return e.STORAGE_DRIVER;
  return e.DATABASE_URL ? "postgres" : "file";
}
