"use client";

import { AlertTriangle, Bot, CheckCircle2, Database, FunctionSquare, Lightbulb, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import type { MarketKey } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

interface Explanation {
  source: "llm" | "template";
  model: string | null;
  question: string;
  sections: { data: string[]; calculations: string[]; interpretation: string[]; limits: string[] };
  verification: { checked: number; unverified: string[] };
  notice: string | null;
}

const SECTIONS = [
  { key: "data", title: "Données", icon: Database, tone: "text-info" },
  { key: "calculations", title: "Calculs", icon: FunctionSquare, tone: "text-primary" },
  { key: "interpretation", title: "Interprétation", icon: Lightbulb, tone: "text-warning" },
  { key: "limits", title: "Limites", icon: ShieldAlert, tone: "text-muted-foreground" },
] as const;

export function ExplainDialog({ matchId, marketKey, marketLabel, trigger }: { matchId: string; marketKey: MarketKey; marketLabel: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");

  const load = useCallback(
    async (q?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, marketKey, question: q || undefined }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "Explication indisponible");
        setData(body as Explanation);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Explication indisponible");
      } finally {
        setLoading(false);
      }
    },
    [matchId, marketKey],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !data && !loading) load();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Explication : {marketLabel}
          </DialogTitle>
          <DialogDescription>
            L&apos;assistant reformule uniquement les statistiques calculées par le moteur. Il ne crée aucune donnée.
          </DialogDescription>
        </DialogHeader>

        {data && <p className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm italic text-muted-foreground">« {data.question} »</p>}

        {loading && (
          <div className="space-y-4" aria-busy>
            {SECTIONS.map((s) => (
              <div key={s.key} className="space-y-2">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-negative/25 bg-negative/5 p-3 text-sm text-negative">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4" /> {error}
            </span>
            <Button size="sm" variant="secondary" onClick={() => load(question)}>
              <RefreshCw /> Réessayer
            </Button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {SECTIONS.map((s) => {
              const items = data.sections[s.key];
              if (!items.length) return null;
              const Icon = s.icon;
              return (
                <section key={s.key}>
                  <h3 className={cn("mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase", s.tone)}>
                    <Icon className="size-3.5" /> {s.title}
                  </h3>
                  <ul className="space-y-1.5 border-l border-border pl-4 text-sm leading-relaxed">
                    {items.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <Badge variant={data.source === "llm" ? "primary" : "default"}>
                <Bot /> {data.source === "llm" ? `IA · ${data.model}` : "Générée automatiquement"}
              </Badge>
              {data.verification.unverified.length === 0 ? (
                <Badge variant="positive">
                  <CheckCircle2 /> {data.verification.checked} chiffre(s) vérifié(s) dans les données du moteur
                </Badge>
              ) : (
                <Badge variant="warning" title={data.verification.unverified.join(", ")}>
                  <AlertTriangle /> {data.verification.unverified.length} chiffre(s) non retrouvé(s) dans les données : à vérifier
                </Badge>
              )}
              {data.notice && <span className="w-full">{data.notice}</span>}
            </div>
          </div>
        )}

        <form
          className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            load(question.trim());
          }}
        >
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            placeholder="Poser une autre question sur cette estimation (optionnel)…"
            className="min-h-10 flex-1 resize-none"
            rows={1}
            aria-label="Question personnalisée"
          />
          <Button type="submit" loading={loading} variant="secondary">
            Expliquer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
