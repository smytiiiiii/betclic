import type { MarketGroup, MarketKey } from "./types";

export interface MarketDefinition {
  key: MarketKey;
  group: MarketGroup;
  /** Libellé court (ex. « Over 2.5 »). */
  label: string;
  /** Libellé long, utilisé dans les explications. */
  description: string;
  /**
   * Marchés formant un ensemble exhaustif avec celui-ci (pour calculer la
   * marge du bookmaker). Ex. : 1X2 → [HOME, DRAW, AWAY].
   */
  book: MarketKey[] | null;
}

const def = (
  key: MarketKey,
  group: MarketGroup,
  label: string,
  description: string,
  book: MarketKey[] | null,
): MarketDefinition => ({ key, group, label, description, book });

const X12: MarketKey[] = ["1X2_HOME", "1X2_DRAW", "1X2_AWAY"];

export const MARKETS: Record<MarketKey, MarketDefinition> = {
  "1X2_HOME": def("1X2_HOME", "1X2", "Victoire domicile", "victoire de l'équipe à domicile", X12),
  "1X2_DRAW": def("1X2_DRAW", "1X2", "Match nul", "match nul", X12),
  "1X2_AWAY": def("1X2_AWAY", "1X2", "Victoire extérieur", "victoire de l'équipe à l'extérieur", X12),
  DC_1X: def("DC_1X", "DOUBLE_CHANCE", "1X", "victoire domicile ou match nul", null),
  DC_X2: def("DC_X2", "DOUBLE_CHANCE", "X2", "match nul ou victoire extérieur", null),
  DC_12: def("DC_12", "DOUBLE_CHANCE", "12", "victoire de l'une ou l'autre équipe (pas de nul)", null),
  OU_1_5_OVER: def("OU_1_5_OVER", "GOALS", "Over 1.5", "au moins 2 buts dans le match", ["OU_1_5_OVER", "OU_1_5_UNDER"]),
  OU_1_5_UNDER: def("OU_1_5_UNDER", "GOALS", "Under 1.5", "au plus 1 but dans le match", ["OU_1_5_OVER", "OU_1_5_UNDER"]),
  OU_2_5_OVER: def("OU_2_5_OVER", "GOALS", "Over 2.5", "au moins 3 buts dans le match", ["OU_2_5_OVER", "OU_2_5_UNDER"]),
  OU_2_5_UNDER: def("OU_2_5_UNDER", "GOALS", "Under 2.5", "au plus 2 buts dans le match", ["OU_2_5_OVER", "OU_2_5_UNDER"]),
  OU_3_5_OVER: def("OU_3_5_OVER", "GOALS", "Over 3.5", "au moins 4 buts dans le match", ["OU_3_5_OVER", "OU_3_5_UNDER"]),
  OU_3_5_UNDER: def("OU_3_5_UNDER", "GOALS", "Under 3.5", "au plus 3 buts dans le match", ["OU_3_5_OVER", "OU_3_5_UNDER"]),
  BTTS_YES: def("BTTS_YES", "BTTS", "BTTS Oui", "les deux équipes marquent", ["BTTS_YES", "BTTS_NO"]),
  BTTS_NO: def("BTTS_NO", "BTTS", "BTTS Non", "au moins une équipe ne marque pas", ["BTTS_YES", "BTTS_NO"]),
  CORNERS_8_5_OVER: def("CORNERS_8_5_OVER", "CORNERS", "Corners +8.5", "au moins 9 corners au total", ["CORNERS_8_5_OVER", "CORNERS_8_5_UNDER"]),
  CORNERS_8_5_UNDER: def("CORNERS_8_5_UNDER", "CORNERS", "Corners -8.5", "au plus 8 corners au total", ["CORNERS_8_5_OVER", "CORNERS_8_5_UNDER"]),
  CORNERS_9_5_OVER: def("CORNERS_9_5_OVER", "CORNERS", "Corners +9.5", "au moins 10 corners au total", ["CORNERS_9_5_OVER", "CORNERS_9_5_UNDER"]),
  CORNERS_9_5_UNDER: def("CORNERS_9_5_UNDER", "CORNERS", "Corners -9.5", "au plus 9 corners au total", ["CORNERS_9_5_OVER", "CORNERS_9_5_UNDER"]),
  CORNERS_10_5_OVER: def("CORNERS_10_5_OVER", "CORNERS", "Corners +10.5", "au moins 11 corners au total", ["CORNERS_10_5_OVER", "CORNERS_10_5_UNDER"]),
  CORNERS_10_5_UNDER: def("CORNERS_10_5_UNDER", "CORNERS", "Corners -10.5", "au plus 10 corners au total", ["CORNERS_10_5_OVER", "CORNERS_10_5_UNDER"]),
};

export const MARKET_GROUP_LABELS: Record<MarketGroup, string> = {
  "1X2": "Résultat (1X2)",
  DOUBLE_CHANCE: "Double chance",
  GOALS: "Buts (Over/Under)",
  BTTS: "Les deux équipes marquent",
  CORNERS: "Corners",
};

export const MARKET_GROUP_ORDER: MarketGroup[] = ["1X2", "DOUBLE_CHANCE", "GOALS", "BTTS", "CORNERS"];

export function marketLabel(key: MarketKey, homeName?: string, awayName?: string): string {
  if (key === "1X2_HOME" && homeName) return `Victoire ${homeName}`;
  if (key === "1X2_AWAY" && awayName) return `Victoire ${awayName}`;
  return MARKETS[key].label;
}

/** Évalue si un marché est gagné pour un score final donné (corners : total). */
export function settleMarket(
  key: MarketKey,
  score: { home: number; away: number },
  totalCorners: number | null,
): boolean | null {
  const { home: h, away: a } = score;
  const total = h + a;
  switch (key) {
    case "1X2_HOME":
      return h > a;
    case "1X2_DRAW":
      return h === a;
    case "1X2_AWAY":
      return a > h;
    case "DC_1X":
      return h >= a;
    case "DC_X2":
      return a >= h;
    case "DC_12":
      return h !== a;
    case "OU_1_5_OVER":
      return total > 1.5;
    case "OU_1_5_UNDER":
      return total < 1.5;
    case "OU_2_5_OVER":
      return total > 2.5;
    case "OU_2_5_UNDER":
      return total < 2.5;
    case "OU_3_5_OVER":
      return total > 3.5;
    case "OU_3_5_UNDER":
      return total < 3.5;
    case "BTTS_YES":
      return h > 0 && a > 0;
    case "BTTS_NO":
      return h === 0 || a === 0;
    default: {
      if (totalCorners === null) return null;
      const m = /^CORNERS_(\d+)_5_(OVER|UNDER)$/.exec(key);
      if (!m) return null;
      const line = Number(m[1]) + 0.5;
      return m[2] === "OVER" ? totalCorners > line : totalCorners < line;
    }
  }
}
