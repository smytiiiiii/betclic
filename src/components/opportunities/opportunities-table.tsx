"use client";

import { ArrowUpDown, ChevronDown, Layers, Search, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfidenceBadge, DemoBadge, EdgeBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/states";
import { TeamCrest } from "@/components/common/team-crest";
import { useApp } from "@/components/layout/app-context";
import { ExplainDialog } from "@/components/match/explain-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMounted } from "@/hooks/use-mounted";
import type { OpportunityDTO } from "@/lib/services/dto";
import { formatDateTime, formatEdge, formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { selectionId, useBetSlip } from "@/stores/bet-slip";

type SortKey = "edge" | "probability" | "odds" | "confidence" | "kickoff";
const ALL = "__all";

type SortState = { key: SortKey; dir: 1 | -1 };

function SortHead({ k, sort, onSort, children, className }: { k: SortKey; sort: SortState; onSort: (s: SortState) => void; children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2 font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort({ key: k, dir: sort.key === k ? (sort.dir === 1 ? -1 : 1) : -1 })}
        className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", sort.key === k && "text-foreground")}
        aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
      >
        {children}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}

export function OpportunitiesTable({ items, minEdge: defaultMinEdge }: { items: OpportunityDTO[]; minEdge: number }) {
  const { timezone } = useApp();
  const mounted = useMounted();
  const selections = useBetSlip((s) => s.selections);
  const toggle = useBetSlip((s) => s.toggle);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState(ALL);
  const [competition, setCompetition] = useState(ALL);
  const [minEdge, setMinEdge] = useState(defaultMinEdge);
  const [minConf, setMinConf] = useState(0);
  const [sort, setSort] = useState<SortState>({ key: "edge", dir: -1 });
  const [open, setOpen] = useState<string | null>(null);
  const [visible, setVisible] = useState(30);

  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);
  const competitions = useMemo(() => [...new Map(items.map((i) => [i.match.competition.id, i.match.competition])).values()], [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((i) => i.edge * 100 >= minEdge && i.confidence >= minConf)
      .filter((i) => group === ALL || i.group === group)
      .filter((i) => competition === ALL || i.match.competition.id === competition)
      .filter((i) => !needle || `${i.match.homeTeam.name} ${i.match.awayTeam.name} ${i.marketLabel}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const v = (x: OpportunityDTO) => (sort.key === "kickoff" ? new Date(x.match.kickoff).getTime() : x[sort.key]);
        return (v(a) - v(b)) * sort.dir;
      });
  }, [items, q, group, competition, minEdge, minConf, sort]);
  const shown = filtered.slice(0, visible);

  const add = (o: OpportunityDTO) => {
    const added = toggle({
      matchId: o.match.id,
      marketKey: o.marketKey,
      matchLabel: `${o.match.homeTeam.shortName} – ${o.match.awayTeam.shortName}`,
      marketLabel: o.marketLabel,
      competition: o.match.competition.name,
      kickoff: o.match.kickoff,
      odds: o.odds,
      probability: o.probability,
    });
    toast(added ? "Ajouté au combiné" : "Retiré du combiné", { description: o.marketLabel });
  };

  return (
    <div className="space-y-4">
      <div className="card-surface grid gap-4 rounded-xl p-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-1">
          <span className="mb-1 block text-[11px] font-medium text-subtle-foreground">Recherche</span>
          <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Équipe ou marché" className="pl-9" />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-medium text-subtle-foreground">Type de marché</span>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-medium text-subtle-foreground">Compétition</span>
          <Select value={competition} onValueChange={setCompetition}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes</SelectItem>
              {competitions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.country.flag} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="mb-2 flex justify-between text-[11px] font-medium text-subtle-foreground">
            Écart minimum <span className="tabular text-foreground">+{minEdge} pts</span>
          </span>
          <Slider value={[minEdge]} min={0} max={25} step={1} onValueChange={([v]) => setMinEdge(v)} aria-label="Écart minimum" />
        </div>
        <div>
          <span className="mb-2 flex justify-between text-[11px] font-medium text-subtle-foreground">
            Confiance minimum <span className="tabular text-foreground">{minConf}</span>
          </span>
          <Slider value={[minConf]} min={0} max={90} step={5} onValueChange={([v]) => setMinConf(v)} aria-label="Confiance minimum" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} marché{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""} sur {items.length}
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={Target} title="Aucun écart ne correspond à ces critères" description="Abaissez l'écart ou la confiance minimum, ou élargissez la période." />
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {shown.map((o) => {
              const inSlip = mounted && selections.some((s) => s.id === selectionId(o.match.id, o.marketKey));
              return (
                <div key={o.id} className="card-surface rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {o.match.competition.country.flag} {o.match.competition.name} · {formatDateTime(o.match.kickoff, timezone)}
                  </div>
                  <Link href={`/matches/${encodeURIComponent(o.match.id)}#markets`} className="mt-1 block text-sm font-semibold">
                    {o.match.homeTeam.name} – {o.match.awayTeam.name}
                  </Link>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-sm">{o.marketLabel}</p>
                      <p className="tabular text-xs text-muted-foreground">
                        Modèle {formatPercent(o.probability)} · Impl. {formatPercent(o.impliedProbability)} · @{formatOdds(o.odds)}
                      </p>
                    </div>
                    <EdgeBadge edge={o.edge} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <ConfidenceBadge level={o.confidenceLevel} score={o.confidence} short />
                    <div className="flex gap-1">
                      <ExplainDialog matchId={o.match.id} marketKey={o.marketKey} marketLabel={o.marketLabel} trigger={<Button variant="ghost" size="icon-sm" aria-label="Expliquer"><Sparkles /></Button>} />
                      <Button variant={inSlip ? "default" : "secondary"} size="icon-sm" onClick={() => add(o)} aria-pressed={inSlip} aria-label="Combiné">
                        <Layers />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="card-surface hidden overflow-hidden rounded-xl md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] tracking-wide text-subtle-foreground">
                    <SortHead sort={sort} onSort={setSort} k="kickoff" className="pl-5">Match</SortHead>
                    <th className="px-3 py-2 font-medium uppercase">Marché</th>
                    <SortHead sort={sort} onSort={setSort} k="odds" className="text-right">Cote</SortHead>
                    <SortHead sort={sort} onSort={setSort} k="probability" className="text-right">Proba. modèle</SortHead>
                    <th className="px-3 py-2 text-right font-medium uppercase">Proba. implicite</th>
                    <SortHead sort={sort} onSort={setSort} k="edge" className="text-right">Écart</SortHead>
                    <SortHead sort={sort} onSort={setSort} k="confidence">Confiance</SortHead>
                    <th className="px-5 py-2 text-right font-medium uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((o) => {
                    const inSlip = mounted && selections.some((s) => s.id === selectionId(o.match.id, o.marketKey));
                    const isOpen = open === o.id;
                    return (
                      <Fragment key={o.id}>
                        <tr className={cn("border-b border-border transition-colors hover:bg-surface-2/50", isOpen && "bg-surface-2/40")}>
                          <td className="py-2.5 pr-3 pl-5">
                            <Link href={`/matches/${encodeURIComponent(o.match.id)}#markets`} className="group flex items-center gap-3">
                              <div className="flex -space-x-1.5">
                                <TeamCrest team={o.match.homeTeam} size="sm" />
                                <TeamCrest team={o.match.awayTeam} size="sm" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium group-hover:underline">
                                  {o.match.homeTeam.shortName} – {o.match.awayTeam.shortName}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {o.match.competition.country.flag} {o.match.competition.shortName} · {formatDateTime(o.match.kickoff, timezone)}
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-3 py-2.5">
                            <button type="button" onClick={() => setOpen(isOpen ? null : o.id)} className="flex items-center gap-1.5 text-left" aria-expanded={isOpen}>
                              <ChevronDown className={cn("size-3.5 text-subtle-foreground transition-transform", isOpen && "rotate-180")} />
                              <span>
                                <span className="block font-medium">{o.marketLabel}</span>
                                <span className="block text-[11px] text-subtle-foreground">{o.group}</span>
                              </span>
                            </button>
                          </td>
                          <td className="tabular px-3 py-2.5 text-right font-semibold">{formatOdds(o.odds)}</td>
                          <td className="tabular px-3 py-2.5 text-right">{formatPercent(o.probability, 1)}</td>
                          <td className="tabular px-3 py-2.5 text-right text-muted-foreground">{formatPercent(o.impliedProbability, 1)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <EdgeBadge edge={o.edge} />
                          </td>
                          <td className="px-3 py-2.5">
                            <ConfidenceBadge level={o.confidenceLevel} score={o.confidence} short />
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex justify-end gap-1">
                              <ExplainDialog
                                matchId={o.match.id}
                                marketKey={o.marketKey}
                                marketLabel={o.marketLabel}
                                trigger={
                                  <Button variant="ghost" size="icon-sm" aria-label={`Expliquer ${o.marketLabel}`}>
                                    <Sparkles />
                                  </Button>
                                }
                              />
                              <Button variant={inSlip ? "default" : "secondary"} size="icon-sm" onClick={() => add(o)} aria-pressed={inSlip} aria-label="Ajouter au combiné">
                                <Layers />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b border-border bg-surface-2/30">
                            <td colSpan={8} className="px-5 py-3 text-sm">
                              <p className="leading-relaxed">{o.explanation}</p>
                              <p className="tabular mt-2 text-xs text-muted-foreground">
                                Probabilité implicite = 1 / {formatOdds(o.odds)} = {formatPercent(o.impliedProbability, 1)}
                                {o.fairImpliedProbability !== null && <> (sans marge : {formatPercent(o.fairImpliedProbability, 1)})</>} · Écart statistique{" "}
                                {formatEdge(o.edge)} · Espérance théorique {o.expectedValue > 0 ? "+" : ""}
                                {formatPercent(o.expectedValue, 1)} · Source : {o.bookmaker} {o.oddsIsDemo && <DemoBadge label="fictive" />}
                              </p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {filtered.length > shown.length && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setVisible((v) => v + 30)}>
                Afficher plus ({filtered.length - shown.length} restants)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
