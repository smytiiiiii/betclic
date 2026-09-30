"use client";

import { ListChecks, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/states";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BET_STATUSES, BET_STATUS_LABELS, betProfit, type Bet, type BetStatus } from "@/lib/domain/bankroll";
import { formatCurrency, formatDate, formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiMutation } from "./use-mutation";

const STATUS_CLS: Record<BetStatus, string> = {
  pending: "text-info",
  won: "text-positive",
  lost: "text-negative",
  void: "text-muted-foreground",
};

function StatusSelect({ bet }: { bet: Bet }) {
  const { run, pending } = useApiMutation();
  return (
    <Select
      value={bet.status}
      disabled={pending}
      onValueChange={(v) => run(`/api/bankroll/bets/${bet.id}`, { method: "PATCH", body: JSON.stringify({ status: v }) }, "Statut mis à jour")}
    >
      <SelectTrigger className={cn("h-8 w-32 text-xs font-medium", STATUS_CLS[bet.status])} aria-label="Statut du pari">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BET_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {BET_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeleteBet({ bet }: { bet: Bet }) {
  const { run, pending } = useApiMutation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Supprimer le pari" disabled={pending}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce pari ?</AlertDialogTitle>
          <AlertDialogDescription>
            « {bet.selection} » sur {bet.matchLabel}. Cette action est irréversible et modifiera vos statistiques.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => run(`/api/bankroll/bets/${bet.id}`, { method: "DELETE" }, "Pari supprimé")}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BetsTable({ bets }: { bets: Bet[] }) {
  const { currency, timezone } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | BetStatus>("all");
  const filtered = useMemo(
    () =>
      bets.filter(
        (b) => (status === "all" || b.status === status) && (!q || `${b.matchLabel} ${b.selection} ${b.competition ?? ""}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [bets, q, status],
  );

  return (
    <Card>
      <CardHeader className="flex-col sm:flex-row">
        <div>
          <CardTitle>Historique des paris</CardTitle>
          <CardDescription>{bets.length} pari(s) enregistré(s)</CardDescription>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="h-8 pl-9 text-xs" />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {BET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {BET_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {filtered.length === 0 ? (
          <div className="px-5">
            <EmptyState icon={ListChecks} title={bets.length ? "Aucun pari ne correspond" : "Aucun pari enregistré"} description={bets.length ? undefined : "Ajoutez un pari pour commencer le suivi de votre bankroll."} />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {filtered.map((b) => (
                <div key={b.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.selection}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.matchLabel} · {formatDate(b.placedAt, timezone)}
                      </p>
                    </div>
                    <DeleteBet bet={b} />
                  </div>
                  <div className="tabular flex items-center justify-between text-xs">
                    <span>
                      @{formatOdds(b.odds)} · {formatCurrency(b.stake, currency)}
                    </span>
                    <span className={cn("font-semibold", betProfit(b) > 0 ? "text-positive" : betProfit(b) < 0 ? "text-negative" : "text-muted-foreground")}>
                      {b.status === "pending" ? "—" : formatCurrency(betProfit(b), currency, true)}
                    </span>
                  </div>
                  <StatusSelect bet={b} />
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] tracking-wide whitespace-nowrap text-subtle-foreground uppercase">
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Match / sélection</th>
                    <th className="px-3 py-2 text-right font-medium">Cote</th>
                    <th className="px-3 py-2 text-right font-medium">Mise</th>
                    <th className="px-3 py-2 text-right font-medium">Proba. modèle</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 text-right font-medium">Gain / perte</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const p = betProfit(b);
                    return (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                        <td className="tabular px-5 py-2.5 text-xs whitespace-nowrap text-muted-foreground">{formatDate(b.placedAt, timezone, { day: "numeric", month: "short", year: "2-digit" })}</td>
                        <td className="max-w-md px-3 py-2.5">
                          <p className="truncate font-medium">{b.selection}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {b.matchLabel}
                            {b.competition ? ` · ${b.competition}` : ""}
                          </p>
                        </td>
                        <td className="tabular px-3 py-2.5 text-right">{formatOdds(b.odds)}</td>
                        <td className="tabular px-3 py-2.5 text-right">{formatCurrency(b.stake, currency)}</td>
                        <td className="tabular px-3 py-2.5 text-right text-muted-foreground">{formatPercent(b.modelProbability, 1)}</td>
                        <td className="px-3 py-2.5">
                          <StatusSelect bet={b} />
                        </td>
                        <td className={cn("tabular px-3 py-2.5 text-right font-semibold", p > 0 ? "text-positive" : p < 0 ? "text-negative" : "text-muted-foreground")}>
                          {b.status === "pending" ? "—" : formatCurrency(p, currency, true)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <DeleteBet bet={b} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
