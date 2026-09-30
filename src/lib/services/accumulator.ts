import "server-only";
import { z } from "zod";
import { marketLabel } from "@/lib/domain/markets";
import { MARKET_KEYS, type Match, type MarketKey } from "@/lib/domain/types";
import { computeAccumulator, type AccumulatorResult } from "@/lib/engine/accumulator";
import { getProvider } from "@/lib/providers";
import { getAnalysisForMatch } from "./analysis";

export const accumulatorRequestSchema = z.object({
  selections: z
    .array(
      z.object({
        matchId: z.string().min(1).max(120),
        marketKey: z.enum(MARKET_KEYS),
        /** Cote saisie par l'utilisateur (optionnelle, remplace la cote de la source). */
        odds: z.number().min(1.01).max(1000).nullable().optional(),
      }),
    )
    .min(1, "Ajoutez au moins une sélection")
    .max(15, "15 sélections maximum"),
});

export interface AccumulatorLegDTO {
  matchId: string;
  matchLabel: string;
  kickoff: string;
  status: Match["status"];
  competition: string;
  marketKey: MarketKey;
  marketLabel: string;
  probability: number;
  odds: number | null;
  oddsSource: "user" | "provider" | null;
  oddsIsDemo: boolean;
  confidence: number;
  confidenceLevel: "low" | "medium" | "high";
}

export interface AccumulatorResponse {
  legs: AccumulatorLegDTO[];
  result: AccumulatorResult;
  unavailable: { matchId: string; marketKey: MarketKey; reason: string }[];
}

export async function evaluateAccumulator(input: unknown): Promise<AccumulatorResponse> {
  const { selections } = accumulatorRequestSchema.parse(input);
  const provider = getProvider();
  const unavailable: AccumulatorResponse["unavailable"] = [];
  const legs: AccumulatorLegDTO[] = [];
  const engineLegs: Parameters<typeof computeAccumulator>[0] = [];

  const uniqueMatchIds = [...new Set(selections.map((s) => s.matchId))];
  const matches = new Map(
    await Promise.all(uniqueMatchIds.map(async (id) => [id, await provider.getMatch(id).catch(() => null)] as const)),
  );

  for (const sel of selections) {
    const match = matches.get(sel.matchId);
    if (!match) {
      unavailable.push({ ...sel, reason: "Match introuvable" });
      continue;
    }
    const { analysis, odds, homeRecords, awayRecords } = await getAnalysisForMatch(match);
    const market = analysis.markets.find((m) => m.key === sel.marketKey);
    if (!market || homeRecords.length < 3 || awayRecords.length < 3) {
      unavailable.push({ ...sel, reason: "Marché non analysable (données insuffisantes)" });
      continue;
    }
    const legOdds = sel.odds ?? market.odds;
    const matchLabel = `${match.homeTeam.shortName} – ${match.awayTeam.shortName}`;
    legs.push({
      matchId: match.id,
      matchLabel,
      kickoff: match.kickoff,
      status: match.status,
      competition: match.competition.name,
      marketKey: sel.marketKey,
      marketLabel: marketLabel(sel.marketKey, match.homeTeam.shortName, match.awayTeam.shortName),
      probability: market.probability,
      odds: legOdds ?? null,
      oddsSource: sel.odds ? "user" : market.odds ? "provider" : null,
      oddsIsDemo: !sel.odds && Boolean(odds?.isDemo),
      confidence: market.confidence.score,
      confidenceLevel: market.confidence.level,
    });
    engineLegs.push({
      matchId: match.id,
      matchLabel,
      marketKey: sel.marketKey,
      odds: legOdds ?? null,
      probability: market.probability,
      scoreMatrix: analysis.scoreMatrix,
    });
  }

  return { legs, result: computeAccumulator(engineLegs), unavailable };
}
