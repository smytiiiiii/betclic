import { z } from "zod";

/**
 * Facteurs du score analytique. Les pondérations par défaut reprennent la
 * spécification produit ; elles sont modifiables depuis la page Paramètres
 * (et validées ici) ou directement dans DEFAULT_FACTOR_WEIGHTS.
 */
export const FACTOR_KEYS = [
  "form",
  "venue",
  "goals",
  "xg",
  "defense",
  "h2h",
  "availability",
  "schedule",
] as const;

export type FactorKey = (typeof FACTOR_KEYS)[number];

export const FACTOR_LABELS: Record<FactorKey, string> = {
  form: "Forme récente",
  venue: "Performance domicile/extérieur",
  goals: "Buts",
  xg: "xG",
  defense: "Défense",
  h2h: "Confrontations",
  availability: "Disponibilité des joueurs",
  schedule: "Calendrier / repos",
};

export const DEFAULT_FACTOR_WEIGHTS: Record<FactorKey, number> = {
  form: 20,
  venue: 15,
  goals: 15,
  xg: 15,
  defense: 10,
  h2h: 5,
  availability: 10,
  schedule: 10,
};

const weight = z.number().min(0).max(100);

export const modelSettingsSchema = z.object({
  weights: z.object({
    form: weight,
    venue: weight,
    goals: weight,
    xg: weight,
    defense: weight,
    h2h: weight,
    availability: weight,
    schedule: weight,
  }),
  /** Influence du score analytique sur les buts attendus (0 = aucune). */
  scoreInfluence: z.number().min(0).max(0.4),
  /** Part du xG dans l'estimation des buts attendus lorsque disponible. */
  xgBlend: z.number().min(0).max(1),
  /** Nombre de matchs récents utilisés par équipe. */
  formWindow: z.number().int().min(5).max(30),
  /** Force du rétrécissement vers la moyenne du championnat (en matchs fictifs). */
  priorMatches: z.number().min(0).max(30),
  /** Demi-vie (en matchs) de la pondération de récence. */
  recencyHalfLife: z.number().min(1).max(30),
  /** Paramètre de corrélation Dixon-Coles pour les scores faibles. */
  dixonColesRho: z.number().min(-0.2).max(0.2),
  /** Écart minimal (en points de %) pour lister une opportunité. */
  minEdge: z.number().min(0).max(30),
  /** Confiance minimale (0-100) pour lister une opportunité. */
  minConfidence: z.number().min(0).max(100),
});

export type ModelSettings = z.infer<typeof modelSettingsSchema>;

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  weights: { ...DEFAULT_FACTOR_WEIGHTS },
  scoreInfluence: 0.12,
  xgBlend: 0.75,
  formWindow: 20,
  priorMatches: 12,
  recencyHalfLife: 10,
  dixonColesRho: -0.06,
  minEdge: 5,
  minConfidence: 45,
};

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const bankrollSettingsSchema = z.object({
  initialBankroll: z.number().min(0).max(10_000_000),
  /** Seuil d'alerte : mise supérieure à X % de la bankroll. */
  maxStakePct: z.number().min(0.5).max(100),
  /** Limite de perte journalière (0 = désactivée). */
  dailyLossLimit: z.number().min(0).max(10_000_000),
  /** Limite de perte hebdomadaire (0 = désactivée). */
  weeklyLossLimit: z.number().min(0).max(10_000_000),
  /** Bloque l'enregistrement d'une mise qui dépasse une limite. */
  hardLimits: z.boolean(),
});

export type BankrollSettings = z.infer<typeof bankrollSettingsSchema>;

export const appSettingsSchema = z.object({
  theme: z.enum(["dark", "light", "system"]),
  currency: z.enum(CURRENCIES),
  language: z.enum(["fr"]),
  notifications: z.object({
    stakeAlerts: z.boolean(),
    lossLimitAlerts: z.boolean(),
    oddsMovements: z.boolean(),
    liveEvents: z.boolean(),
    /** Rappel de pause en minutes (0 = désactivé). */
    sessionReminderMinutes: z.number().int().min(0).max(480),
  }),
  favoriteCompetitions: z.array(z.string().max(64)).max(50),
  bankroll: bankrollSettingsSchema,
  model: modelSettingsSchema,
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  currency: "EUR",
  language: "fr",
  notifications: {
    stakeAlerts: true,
    lossLimitAlerts: true,
    oddsMovements: true,
    liveEvents: true,
    sessionReminderMinutes: 60,
  },
  favoriteCompetitions: [],
  bankroll: {
    initialBankroll: 100,
    maxStakePct: 5,
    dailyLossLimit: 0,
    weeklyLossLimit: 0,
    hardLimits: false,
  },
  model: DEFAULT_MODEL_SETTINGS,
};

/** Fusionne des paramètres partiels (ex. anciens fichiers) avec les défauts. */
export function withDefaults(input: unknown): AppSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<AppSettings>;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...raw,
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(raw.notifications ?? {}) },
    bankroll: { ...DEFAULT_SETTINGS.bankroll, ...(raw.bankroll ?? {}) },
    model: {
      ...DEFAULT_SETTINGS.model,
      ...(raw.model ?? {}),
      weights: { ...DEFAULT_SETTINGS.model.weights, ...(raw.model?.weights ?? {}) },
    },
  };
  const parsed = appSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
