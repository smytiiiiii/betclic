import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { fingerprint, memo } from "@/lib/cache";
import { env } from "@/lib/config/env";
import { MARKET_KEYS, type MarketKey } from "@/lib/domain/types";
import { getMatchDetail } from "@/lib/services/analysis";
import { buildFacts, unverifiedNumbers, type Facts } from "./facts";

export const explainRequestSchema = z.object({
  matchId: z.string().min(1).max(120),
  marketKey: z.enum(MARKET_KEYS),
  question: z.string().trim().max(300).optional(),
});

const sectionsSchema = z.object({
  data: z.array(z.string()).describe("Faits bruts tirés du JSON (chiffres cités tels quels)."),
  calculations: z.array(z.string()).describe("Comment le moteur combine ces faits pour produire la probabilité."),
  interpretation: z.array(z.string()).describe("Lecture prudente de ce que suggèrent les calculs."),
  limits: z.array(z.string()).describe("Données manquantes, incertitudes et limites du modèle."),
});

export type ExplanationSections = z.infer<typeof sectionsSchema>;

export interface Explanation {
  source: "llm" | "template";
  model: string | null;
  question: string;
  sections: ExplanationSections;
  verification: { checked: number; unverified: string[] };
  notice: string | null;
  generatedAt: string;
}

const SYSTEM_PROMPT = `Tu es l'assistant explicatif d'une plateforme d'analyse statistique de football.
Ta mission unique : expliquer, en français clair et accessible, POURQUOI le moteur statistique produit l'estimation décrite dans le JSON fourni.

Règles impératives :
1. Utilise EXCLUSIVEMENT les valeurs présentes dans le JSON. N'invente, n'extrapole et ne complète aucune statistique, blessure, suspension, composition, transfert, météo ou actualité. Si une donnée vaut null ou est indiquée comme non fournie, dis explicitement qu'elle n'est pas disponible.
2. Cite les chiffres tels qu'ils apparaissent dans le JSON (tu peux arrondir à l'unité un pourcentage).
3. Répartis ta réponse en quatre sections :
   - data : les faits bruts utilisés (chiffres du JSON) ;
   - calculations : comment le moteur les combine (buts attendus, loi de Poisson, comparaison avec la probabilité implicite de la cote = 1 / cote) ;
   - interpretation : ce que ces calculs suggèrent, formulé avec prudence ;
   - limits : incertitudes, données manquantes, limites du modèle.
4. Ne présente jamais une issue comme certaine. N'encourage jamais à parier. N'écris jamais qu'un pari « va gagner » ou qu'il est « sûr ». Emploie des formulations comme « probabilité statistique estimée ».
5. Si is_demo_data vaut true, précise dans limits que les données sont fictives (démonstration).
6. Si la question de l'utilisateur sort du cadre de l'analyse statistique de ce match, recentre-toi sur l'explication de l'estimation.
7. 2 à 5 phrases courtes par section.`;

const pct = (v: number | null) => (v === null ? "n.d." : `${v.toLocaleString("fr-FR")} %`);
const num = (v: number | null) => (v === null ? "n.d." : v.toLocaleString("fr-FR"));

/** Explication déterministe (sans LLM), construite uniquement à partir des faits. */
function templateExplanation(f: Facts): ExplanationSections {
  const m = f.market;
  const h = f.home_team_stats;
  const a = f.away_team_stats;
  const data = [
    `${f.match.home_team} : ${num(h.goals_for_per_match_weighted)} buts marqués et ${num(h.goals_against_per_match_weighted)} encaissés par match (pondérés, ${h.matches_analysed} matchs), forme récente ${h.form_last5_most_recent_first || "n.d."} (du plus récent au plus ancien).`,
    `${f.match.away_team} : ${num(a.goals_for_per_match_weighted)} buts marqués et ${num(a.goals_against_per_match_weighted)} encaissés par match (${a.matches_analysed} matchs), forme récente ${a.form_last5_most_recent_first || "n.d."}.`,
  ];
  if (h.xg_for_per_match !== null && a.xg_for_per_match !== null) {
    data.push(`xG par match : ${num(h.xg_for_per_match)} (xGA ${num(h.xg_against_per_match)}) contre ${num(a.xg_for_per_match)} (xGA ${num(a.xg_against_per_match)}).`);
  } else {
    data.push("Les xG ne sont pas disponibles pour ce match.");
  }
  if (m.key.startsWith("OU") || m.key.startsWith("BTTS")) {
    data.push(`Matchs à plus de 2,5 buts : ${pct(h.over_2_5_rate_pct)} et ${pct(a.over_2_5_rate_pct)} ; BTTS : ${pct(h.btts_rate_pct)} et ${pct(a.btts_rate_pct)}.`);
  }
  if (f.head_to_head) data.push(`${f.head_to_head.matches} confrontation(s) directe(s) récente(s), ${num(f.head_to_head.avg_goals)} buts par match en moyenne.`);

  const calculations = [
    `Buts attendus : ${num(f.expected_goals.home)} pour ${f.match.home_team} et ${num(f.expected_goals.away)} pour ${f.match.away_team} (total ${num(f.expected_goals.total)}).`,
    `Une loi de Poisson corrigée (Dixon-Coles) répartit ces buts attendus en probabilités de scores exacts ; la somme des scores correspondant à « ${m.definition} » donne ${pct(m.estimated_probability_pct)}.`,
  ];
  if (f.expected_goals.xg_based_model) {
    calculations.push(`Modèle « buts » seul : ${pct(m.probability_goals_model_pct)} ; modèle « xG » seul : ${pct(m.probability_xg_model_pct)}. L'estimation finale combine les deux.`);
  }
  if (m.bookmaker_odds !== null) {
    calculations.push(`Cote ${num(m.bookmaker_odds)} → probabilité implicite 1 / ${num(m.bookmaker_odds)} = ${pct(m.implied_probability_pct)}. Écart statistique : ${m.statistical_gap_points !== null && m.statistical_gap_points > 0 ? "+" : ""}${num(m.statistical_gap_points)} points.`);
  } else {
    calculations.push("Aucune cote disponible : pas de comparaison avec une probabilité implicite.");
  }

  const interpretation = [
    `Probabilité statistique estimée : ${pct(m.estimated_probability_pct)} (cote « juste » équivalente : ${num(m.fair_odds)}).`,
    `Niveau de confiance statistique : ${m.confidence_level === "high" ? "élevé" : m.confidence_level === "medium" ? "moyen" : "faible"} (${m.confidence_score}/100) — ${m.confidence_reasons.join(" ; ")}.`,
  ];
  if (m.statistical_gap_points !== null) {
    interpretation.push(
      m.statistical_gap_points > 0
        ? "Le modèle estime une probabilité supérieure à celle implicite de la cote : c'est un écart statistique, pas une garantie."
        : "Le modèle estime une probabilité inférieure ou égale à celle implicite de la cote.",
    );
  }

  const limits = [...f.warnings, ...f.limitations.slice(0, 3)];
  if (f.player_availability === "non fournie par la source") limits.unshift("Absences et suspensions non fournies par la source : non prises en compte.");
  if (f.is_demo_data) limits.unshift("Données de démonstration : équipes, statistiques et cotes sont fictives.");
  return { data, calculations, interpretation, limits };
}

const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

async function llmExplanation(facts: Facts, question: string): Promise<{ sections: ExplanationSections; model: string } | { refused: true }> {
  const e = env();
  const client = new Anthropic({ apiKey: e.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 });
  const model = e.LLM_MODEL;
  const response = await client.beta.messages.parse({
    model,
    max_tokens: 4000,
    // Repli automatique côté serveur en cas de refus (modèles compatibles uniquement).
    ...(FALLBACK_MODELS.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    output_config: { effort: e.LLM_EFFORT, format: betaZodOutputFormat(sectionsSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Données du moteur (JSON) :\n${JSON.stringify(facts)}\n\nQuestion de l'utilisateur : ${question}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return { refused: true };
  return { sections: response.parsed_output, model: response.model };
}

export async function explainMarket(input: z.infer<typeof explainRequestSchema>): Promise<Explanation> {
  const detail = await getMatchDetail(input.matchId);
  if (!detail) throw new ExplainError("Match introuvable", 404);
  if (!detail.analysis) throw new ExplainError(detail.analysisError ?? "Analyse indisponible", 422);
  const facts = buildFacts(detail, input.marketKey as MarketKey);
  const question =
    input.question ||
    `Pourquoi le modèle estime-t-il que « ${facts.market.label} » possède une probabilité de ${Math.round(facts.market.estimated_probability_pct ?? 0)} % ?`;

  const e = env();
  const key = `explain:${input.matchId}:${input.marketKey}:${fingerprint({ question, facts })}`;
  return memo(key, 30 * 60_000, async () => {
    let notice: string | null = null;
    if (e.ANTHROPIC_API_KEY) {
      try {
        const out = await llmExplanation(facts, question);
        if ("sections" in out) {
          const all = [...out.sections.data, ...out.sections.calculations, ...out.sections.interpretation, ...out.sections.limits];
          return {
            source: "llm",
            model: out.model,
            question,
            sections: out.sections,
            verification: unverifiedNumbers(all, facts),
            notice: null,
            generatedAt: new Date().toISOString(),
          } satisfies Explanation;
        }
        notice = "Le modèle de langage n'a pas produit de réponse : explication générée automatiquement à partir des mêmes données.";
      } catch (err) {
        console.error("[explain] LLM indisponible", err instanceof Error ? err.message : err);
        notice = "Service d'IA momentanément indisponible : explication générée automatiquement à partir des mêmes données.";
      }
    }
    const sections = templateExplanation(facts);
    return {
      source: "template",
      model: null,
      question,
      sections,
      verification: unverifiedNumbers([...sections.data, ...sections.calculations, ...sections.interpretation], facts),
      notice: notice ?? (e.ANTHROPIC_API_KEY ? null : "Aucune clé ANTHROPIC_API_KEY configurée : explication générée par modèle de texte déterministe."),
      generatedAt: new Date().toISOString(),
    } satisfies Explanation;
  });
}

export class ExplainError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
