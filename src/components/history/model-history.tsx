"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Download, History, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/states";
import { useApp } from "@/components/layout/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MARKETS, MARKET_GROUP_LABELS, MARKET_GROUP_ORDER } from "@/lib/domain/markets";
import type { BacktestRecord } from "@/lib/services/dto";
import { formatDate, formatEdge, formatInteger, formatOdds, formatPercent, formatUnits } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL = "__all";
const PAGE = 25;

export function ModelHistory({ records }: { records: BacktestRecord[] }) {
  const { timezone } = useApp();
  const [q, setQ] = useState("");
  const [competition, setCompetition] = useState(ALL);
  const [group, setGroup] = useState(ALL);
  const [result, setResult] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const competitions = useMemo(() => [...new Set(records.map((r) => r.competition))].sort(), [records]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return records.filter((r) => {
      if (competition !== ALL && r.competition !== competition) return false;
      if (group !== ALL && MARKETS[r.marketKey].group !== group) return false;
      if (result === "won" && !r.won) return false;
      if (result === "lost" && r.won) return false;
      const day = r.date.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (needle && !`${r.matchLabel} ${r.marketLabel} ${r.competition}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [records, q, competition, group, result, from, to]);

  const stats = useMemo(() => {
    const won = filtered.filter((r) => r.won).length;
    const profit = filtered.reduce((s, r) => s + r.profit, 0);
    const avgOdds = filtered.length ? filtered.reduce((s, r) => s + r.odds, 0) / filtered.length : null;
    const avgProb = filtered.length ? filtered.reduce((s, r) => s + r.probability, 0) / filtered.length : null;
    return { n: filtered.length, won, hit: filtered.length ? won / filtered.length : null, profit, roi: filtered.length ? profit / filtered.length : null, avgOdds, avgProb };
  }, [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE);

  const exportCsv = () => {
    const header = ["date", "match", "competition", "marche", "cote", "probabilite_modele", "probabilite_implicite", "ecart_pts", "resultat", "gain_unites", "score"];
    const lines = filtered.map((r) =>
      [r.date, r.matchLabel, r.competition, r.marketLabel, r.odds, r.probability.toFixed(4), r.impliedProbability.toFixed(4), (r.edge * 100).toFixed(1), r.won ? "gagne" : "perdu", r.profit.toFixed(2), r.score]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob([`﻿${header.join(";")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kairos-historique-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = (fn: () => void) => {
    fn();
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="card-surface grid gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Rechercher un match, un marché…" className="pl-9" aria-label="Recherche" />
        </div>
        <Select value={competition} onValueChange={(v) => reset(() => setCompetition(v))}>
          <SelectTrigger aria-label="Compétition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes compétitions</SelectItem>
            {competitions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={group} onValueChange={(v) => reset(() => setGroup(v))}>
          <SelectTrigger aria-label="Marché">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous marchés</SelectItem>
            {MARKET_GROUP_ORDER.map((g) => (
              <SelectItem key={g} value={g}>
                {MARKET_GROUP_LABELS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={result} onValueChange={(v) => reset(() => setResult(v))}>
          <SelectTrigger aria-label="Résultat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous résultats</SelectItem>
            <SelectItem value="won">Gagnés</SelectItem>
            <SelectItem value="lost">Perdus</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} aria-label="Du" className="text-xs" />
          <Input type="date" value={to} onChange={(e) => reset(() => setTo(e.target.value))} aria-label="Au" className="text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {[
          { l: "Sélections", v: formatInteger(stats.n) },
          { l: "Taux de réussite", v: formatPercent(stats.hit, 1) },
          { l: "Probabilité moyenne", v: formatPercent(stats.avgProb, 1) },
          { l: "Cote moyenne", v: formatOdds(stats.avgOdds) },
          { l: "Gain / perte", v: formatUnits(stats.profit), tone: stats.profit >= 0 ? "text-positive" : "text-negative" },
          { l: "ROI", v: formatPercent(stats.roi, 1), tone: (stats.roi ?? 0) >= 0 ? "text-positive" : "text-negative" },
        ].map((s) => (
          <div key={s.l} className="card-surface rounded-xl px-4 py-3">
            <div className="text-[11px] text-muted-foreground">{s.l}</div>
            <div className={cn("tabular mt-1 text-xl font-semibold", s.tone)}>{s.v}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={History} title="Aucun résultat" description="Modifiez vos filtres de recherche." />
            </div>
          ) : (
            <>
              <div className="divide-y divide-border md:hidden">
                {rows.map((r) => (
                  <Link key={r.id} href={`/matches/${encodeURIComponent(r.matchId)}`} className="block px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{r.marketLabel}</span>
                      <span className={cn("tabular text-sm font-semibold", r.won ? "text-positive" : "text-negative")}>{formatUnits(r.profit)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.matchLabel} ({r.score}) · {formatDate(r.date, timezone)}
                    </p>
                    <p className="tabular mt-1 text-xs text-subtle-foreground">
                      @{formatOdds(r.odds)} · modèle {formatPercent(r.probability)} · écart {formatEdge(r.edge)}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] tracking-wide text-subtle-foreground uppercase">
                      <th className="px-5 py-2.5 font-medium">Date</th>
                      <th className="px-3 py-2.5 font-medium">Match</th>
                      <th className="px-3 py-2.5 font-medium">Marché</th>
                      <th className="px-3 py-2.5 text-right font-medium">Cote</th>
                      <th className="px-3 py-2.5 text-right font-medium">Probabilité modèle</th>
                      <th className="px-3 py-2.5 text-right font-medium">Écart</th>
                      <th className="px-3 py-2.5 font-medium">Résultat</th>
                      <th className="px-3 py-2.5 text-right font-medium">Gain / perte</th>
                      <th className="px-5 py-2.5 text-right font-medium">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                        <td className="tabular px-5 py-2.5 text-xs text-muted-foreground">{formatDate(r.date, timezone, { day: "numeric", month: "short" })}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`/matches/${encodeURIComponent(r.matchId)}`} className="font-medium hover:underline">
                            {r.matchLabel}
                          </Link>
                          <span className="tabular ml-2 text-xs text-muted-foreground">{r.score}</span>
                          <p className="text-[11px] text-subtle-foreground">{r.competition}</p>
                        </td>
                        <td className="px-3 py-2.5">{r.marketLabel}</td>
                        <td className="tabular px-3 py-2.5 text-right">{formatOdds(r.odds)}</td>
                        <td className="tabular px-3 py-2.5 text-right">{formatPercent(r.probability, 1)}</td>
                        <td className="tabular px-3 py-2.5 text-right text-muted-foreground">{formatEdge(r.edge)}</td>
                        <td className="px-3 py-2.5">
                          {r.won ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-positive">
                              <CheckCircle2 className="size-3.5" /> Gagné
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-negative">
                              <XCircle className="size-3.5" /> Perdu
                            </span>
                          )}
                        </td>
                        <td className={cn("tabular px-3 py-2.5 text-right font-semibold", r.won ? "text-positive" : "text-negative")}>{formatUnits(r.profit)}</td>
                        <td className={cn("tabular px-5 py-2.5 text-right", r.won ? "text-positive" : "text-negative")}>{formatPercent(r.profit, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!filtered.length}>
          <Download /> Exporter en CSV
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular">
            Page {current + 1} / {pages}
          </span>
          <Button variant="secondary" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Page précédente">
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="icon-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Page suivante">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
