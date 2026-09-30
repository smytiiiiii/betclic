"use client";

import { AlertTriangle, ArrowRight, Info, Layers, Loader2, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfidenceBadge, DemoBadge } from "@/components/common/badges";
import { InfoTip } from "@/components/common/info-tip";
import { EmptyState, ErrorState } from "@/components/common/states";
import { useApp } from "@/components/layout/app-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import { useNow } from "@/hooks/use-now";
import { RISK_LABELS, type AccumulatorResult, type RiskLevel } from "@/lib/engine/accumulator";
import type { AccumulatorLegDTO } from "@/lib/services/accumulator";
import { checkStake } from "@/lib/services/bankroll-math";
import type { BankrollSettings } from "@/lib/domain/settings";
import { formatCurrency, formatDateTime, formatEdge, formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/stores/bet-slip";

interface ApiResponse {
  legs: AccumulatorLegDTO[];
  result: AccumulatorResult;
  unavailable: { matchId: string; marketKey: string; reason: string }[];
}

const RISK_STYLE: Record<RiskLevel, { cls: string; bar: number }> = {
  moderate: { cls: "text-info", bar: 0.25 },
  high: { cls: "text-warning", bar: 0.5 },
  very_high: { cls: "text-negative", bar: 0.75 },
  extreme: { cls: "text-negative", bar: 1 },
};

export function AccumulatorBuilder({ balance, bankroll }: { balance: number; bankroll: BankrollSettings }) {
  const router = useRouter();
  const { currency, timezone } = useApp();
  const mounted = useMounted();
  const now = useNow();
  const selections = useBetSlip((s) => s.selections);
  const remove = useBetSlip((s) => s.remove);
  const clear = useBetSlip((s) => s.clear);
  const setCustomOdds = useBetSlip((s) => s.setCustomOdds);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stake, setStake] = useState("2");
  const [saving, setSaving] = useState(false);

  const payload = useMemo(
    () => JSON.stringify({ selections: selections.map((s) => ({ matchId: s.matchId, marketKey: s.marketKey, odds: s.customOdds })) }),
    [selections],
  );

  useEffect(() => {
    if (!mounted || selections.length === 0) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/accumulator", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, signal: controller.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "Calcul impossible");
        setData(body as ApiResponse);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(e instanceof Error ? e.message : "Calcul impossible");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [payload, mounted, selections.length]);

  if (!mounted) {
    return <div className="card-surface skeleton h-80 rounded-xl" />;
  }

  if (selections.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Votre combiné est vide"
        description="Ajoutez des marchés depuis l'analyse d'un match ou la page Opportunités pour estimer une probabilité combinée."
        action={
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/opportunities">Voir les opportunités</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/matches">Parcourir les matchs</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const result = data?.result;
  const stakeValue = Number(stake.replace(",", "."));
  const validStake = Number.isFinite(stakeValue) && stakeValue > 0;
  const check = validStake ? checkStake(stakeValue, balance, bankroll) : null;
  const legById = new Map(data?.legs.map((l) => [`${l.matchId}:${l.marketKey}`, l]) ?? []);

  const save = async () => {
    if (!result?.totalOdds || !validStake) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bankroll/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placedAt: new Date().toISOString(),
          matchLabel: selections.length === 1 ? selections[0].matchLabel : `Combiné ${selections.length} sélections`,
          competition: null,
          marketKey: selections.length === 1 ? selections[0].marketKey : null,
          matchId: selections.length === 1 ? selections[0].matchId : null,
          selection: selections.map((s) => `${s.matchLabel} : ${s.marketLabel}`).join(" | ").slice(0, 160),
          odds: result.totalOdds,
          stake: stakeValue,
          status: "pending",
          modelProbability: result.adjustedProbability,
          notes: "Enregistré depuis l'outil Combinés",
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Enregistrement impossible");
      toast.success("Mise enregistrée dans votre bankroll");
      router.push("/bankroll");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <Card className="self-start xl:col-span-3">
        <CardHeader>
          <div>
            <CardTitle>Sélections ({selections.length})</CardTitle>
            <CardDescription>Vous pouvez saisir la cote de votre opérateur pour chaque sélection.</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 /> Vider
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Vider le combiné ?</AlertDialogTitle>
                <AlertDialogDescription>Les {selections.length} sélections seront retirées.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={clear}>Vider</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {selections.map((s) => {
            const leg = legById.get(s.id);
            const started = now !== null && new Date(s.kickoff).getTime() < now;
            return (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/40 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/matches/${encodeURIComponent(s.matchId)}#markets`} className="text-sm font-semibold hover:underline">
                    {s.marketLabel}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.matchLabel} · {s.competition} · {formatDateTime(s.kickoff, timezone)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="tabular">
                      Modèle {formatPercent(leg?.probability ?? s.probability, 1)}
                    </Badge>
                    {leg && <ConfidenceBadge level={leg.confidenceLevel} score={leg.confidence} short />}
                    {leg?.oddsIsDemo && <DemoBadge label="cote fictive" />}
                    {started && <Badge variant="warning">Match commencé</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex flex-col text-[10px] text-subtle-foreground">
                    Cote
                    <Input
                      inputMode="decimal"
                      className="tabular h-8 w-20 text-right"
                      placeholder={s.odds ? formatOdds(s.odds) : "—"}
                      defaultValue={s.customOdds ?? ""}
                      aria-label={`Cote pour ${s.marketLabel}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value.replace(",", "."));
                        setCustomOdds(s.id, e.target.value.trim() === "" ? null : Number.isFinite(v) && v >= 1.01 && v <= 1000 ? v : null);
                        if (e.target.value.trim() !== "" && !(Number.isFinite(v) && v >= 1.01)) {
                          toast.error("Cote invalide (minimum 1,01)");
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(s.id)} aria-label={`Retirer ${s.marketLabel}`} className="mt-3">
                    <X />
                  </Button>
                </div>
              </div>
            );
          })}
          {data?.unavailable.map((u) => (
            <p key={`${u.matchId}:${u.marketKey}`} className="text-xs text-warning">
              Sélection ignorée ({u.marketKey}) : {u.reason}
            </p>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4 xl:col-span-2">
        <Card className="relative overflow-hidden">
          {loading && (
            <div className="absolute top-4 right-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <CardHeader>
            <div>
              <CardTitle>Analyse du combiné</CardTitle>
              <CardDescription>Estimation statistique approximative</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <ErrorState title="Calcul impossible" description={error} />}
            {!result && !error && <div className="skeleton h-40 rounded-lg" />}
            {result && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-[11px] text-muted-foreground">Cote totale</div>
                    <div className="tabular mt-1 text-3xl font-semibold">{formatOdds(result.totalOdds)}</div>
                    <div className="tabular text-[11px] text-subtle-foreground">Implicite {formatPercent(result.impliedProbability, 1)}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      Probabilité combinée
                      <InfoTip>
                        Approximation : corrélations intra-match calculées sur la matrice des scores ; indépendance supposée entre matchs différents.
                      </InfoTip>
                    </div>
                    <div className="tabular mt-1 text-3xl font-semibold">{formatPercent(result.adjustedProbability, 1)}</div>
                    <div className="tabular text-[11px] text-subtle-foreground">Produit naïf {formatPercent(result.naiveProbability, 1)}</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Niveau de risque statistique</span>
                    <span className={cn("font-semibold", RISK_STYLE[result.risk].cls)}>{RISK_LABELS[result.risk]}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {(["moderate", "high", "very_high", "extreme"] as const).map((r, i) => (
                      <span
                        key={r}
                        className={cn("h-1.5 rounded-full", i <= Object.keys(RISK_STYLE).indexOf(result.risk) ? (i < 1 ? "bg-info" : i < 2 ? "bg-warning" : "bg-negative") : "bg-surface-3")}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Environ {result.adjustedProbability > 0 ? `1 chance sur ${Math.max(1, Math.round(1 / result.adjustedProbability))}` : "aucune chance"} selon le modèle. Plus
                    les sélections sont nombreuses, plus la probabilité s&apos;effondre.
                  </p>
                </div>

                {result.edge !== null && (
                  <div className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Écart statistique (modèle − implicite)</span>
                    <span className={cn("tabular font-semibold", result.edge > 0 ? "text-positive" : "text-muted-foreground")}>{formatEdge(result.edge)}</span>
                  </div>
                )}

                {result.groups.some((g) => g.method === "score_matrix") && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Corrélations intra-match</p>
                    {result.groups
                      .filter((g) => g.method !== "single")
                      .map((g) => (
                        <div key={g.matchId} className="rounded-lg border border-border px-3 py-2 text-xs">
                          <div className="tabular flex justify-between font-medium">
                            <span>{g.matchLabel}</span>
                            <span>
                              {formatPercent(g.naiveProbability, 1)} → {formatPercent(g.jointProbability, 1)}
                            </span>
                          </div>
                          {g.note && <p className="mt-0.5 text-muted-foreground">{g.note}</p>}
                        </div>
                      ))}
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <ul className="space-y-1.5 rounded-lg border border-warning/25 bg-warning/5 p-3 text-xs text-muted-foreground">
                    {result.warnings.map((w) => (
                      <li key={w} className="flex gap-2">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Simulation de mise</CardTitle>
              <CardDescription>Solde disponible : {formatCurrency(balance, currency)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">Mise ({currency})</span>
              <Input inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} className="tabular mt-1" aria-invalid={!validStake} />
            </label>
            {validStake && result?.totalOdds && (
              <div className="tabular grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-surface-2/60 px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">Retour potentiel</div>
                  <div className="font-semibold">{formatCurrency(stakeValue * result.totalOdds, currency)}</div>
                </div>
                <div className="rounded-lg bg-surface-2/60 px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">Part de la bankroll</div>
                  <div className={cn("font-semibold", check?.level === "high" && "text-negative", check?.level === "caution" && "text-warning")}>
                    {formatPercent(check?.pctOfBankroll ?? null, 1)}
                  </div>
                </div>
              </div>
            )}
            {check && check.messages.length > 0 && (
              <div className={cn("flex gap-2 rounded-lg border p-3 text-xs", check.level === "high" ? "border-negative/30 bg-negative/5 text-negative" : "border-warning/30 bg-warning/5 text-warning")}>
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div>{check.messages.join(" ")}</div>
              </div>
            )}
            <SaveButton disabled={!validStake || !result?.totalOdds || saving} saving={saving} warn={check?.level === "high"} onConfirm={save} />
            <p className="flex items-start gap-1.5 text-[11px] text-subtle-foreground">
              <Info className="mt-0.5 size-3 shrink-0" />
              Kairos n&apos;est pas un opérateur de paris : l&apos;enregistrement sert uniquement au suivi de votre bankroll.
            </p>
            <Button asChild variant="link" size="sm">
              <Link href="/bankroll">
                Gérer ma bankroll <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SaveButton({ disabled, saving, warn, onConfirm }: { disabled: boolean; saving: boolean; warn: boolean; onConfirm: () => void }) {
  if (!warn) {
    return (
      <Button className="w-full" disabled={disabled} loading={saving} onClick={onConfirm}>
        <Save /> Enregistrer dans ma bankroll
      </Button>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full" variant="destructive" disabled={disabled} loading={saving}>
          <Save /> Enregistrer malgré l&apos;alerte
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mise élevée</AlertDialogTitle>
          <AlertDialogDescription>
            Cette mise dépasse le seuil que vous avez fixé. Les paris comportent un risque de perte financière : êtes-vous sûr de vouloir l&apos;enregistrer ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Enregistrer quand même</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
