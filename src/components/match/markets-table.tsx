"use client";

import { ArrowDownRight, ArrowUpRight, ChevronDown, Layers, Sparkles } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { ConfidenceBadge, DemoBadge, EdgeBadge } from "@/components/common/badges";
import { InfoTip } from "@/components/common/info-tip";
import { useApp } from "@/components/layout/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hint } from "@/components/ui/tooltip";
import { useMounted } from "@/hooks/use-mounted";
import { MARKET_GROUP_LABELS, MARKET_GROUP_ORDER, marketLabel } from "@/lib/domain/markets";
import type { Match, MatchOdds } from "@/lib/domain/types";
import type { MarketEstimate } from "@/lib/engine/types";
import { formatEdge, formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_SELECTIONS, selectionId, useBetSlip } from "@/stores/bet-slip";
import { ExplainDialog } from "./explain-dialog";

export function MarketsTable({ markets, match, odds }: { markets: MarketEstimate[]; match: Match; odds: MatchOdds | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const mounted = useMounted();
  const selections = useBetSlip((s) => s.selections);
  const toggle = useBetSlip((s) => s.toggle);
  const canBet = match.status === "SCHEDULED";
  const { notifications } = useApp();

  // Variation des cotes depuis l'ouverture (affichée si ≥ 3 %).
  const movement = (key: MarketEstimate["key"]): number | null => {
    if (!notifications.oddsMovements || !odds || odds.history.length < 2) return null;
    const first = odds.history[0].odds[key];
    const last = odds.history[odds.history.length - 1].odds[key];
    if (!first || !last) return null;
    const delta = (last - first) / first;
    return Math.abs(delta) >= 0.03 ? delta : null;
  };

  const onToggle = (m: MarketEstimate) => {
    const label = marketLabel(m.key, match.homeTeam.shortName, match.awayTeam.shortName);
    const added = toggle({
      matchId: match.id,
      marketKey: m.key,
      matchLabel: `${match.homeTeam.shortName} – ${match.awayTeam.shortName}`,
      marketLabel: label,
      competition: match.competition.name,
      kickoff: match.kickoff,
      odds: m.odds,
      probability: m.probability,
    });
    if (added) toast.success("Ajouté au combiné", { description: label });
    else if (useBetSlip.getState().selections.length >= MAX_SELECTIONS) toast.error(`Maximum ${MAX_SELECTIONS} sélections`);
    else toast("Retiré du combiné", { description: label });
  };

  return (
    <Card id="markets" className="scroll-mt-24">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            Marchés & écarts statistiques
            <InfoTip>
              Probabilité implicite = 1 / cote. Écart = probabilité estimée − probabilité implicite. Un écart positif est une information statistique, jamais une
              garantie de gain.
            </InfoTip>
          </CardTitle>
          <CardDescription>
            {odds ? (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                Cotes : {odds.bookmaker} {odds.isDemo && <DemoBadge label="cotes fictives" />}
              </span>
            ) : (
              "Aucune source de cotes disponible pour ce match : seules les probabilités sont affichées."
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {/* Mobile : cartes empilées */}
        <div className="space-y-4 px-4 md:hidden">
          {MARKET_GROUP_ORDER.map((group) => {
            const list = markets.filter((m) => m.group === group);
            if (!list.length) return null;
            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{MARKET_GROUP_LABELS[group]}</p>
                <div className="space-y-2">
                  {list.map((m) => {
                    const label = marketLabel(m.key, match.homeTeam.shortName, match.awayTeam.shortName);
                    const inSlip = mounted && selections.some((s) => s.id === selectionId(match.id, m.key));
                    return (
                      <div key={m.key} className="rounded-lg border border-border bg-surface-2/40 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="tabular mt-0.5 text-2xl font-semibold">{formatPercent(m.probability, 1)}</p>
                          </div>
                          <div className="flex gap-1">
                            <ExplainDialog
                              matchId={match.id}
                              marketKey={m.key}
                              marketLabel={label}
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label={`Expliquer ${label}`}>
                                  <Sparkles />
                                </Button>
                              }
                            />
                            <Button variant={inSlip ? "default" : "secondary"} size="icon-sm" disabled={!canBet} onClick={() => onToggle(m)} aria-pressed={inSlip} aria-label="Combiné">
                              <Layers />
                            </Button>
                          </div>
                        </div>
                        <div className="tabular mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                          <span>Cote {formatOdds(m.odds)}</span>
                          <span>Impl. {formatPercent(m.impliedProbability)}</span>
                          <span className="text-right">
                            <EdgeBadge edge={m.edge} />
                          </span>
                        </div>
                        <div className="mt-2">
                          <ConfidenceBadge level={m.confidence.level} score={m.confidence.score} short />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-subtle-foreground uppercase">
                <th className="px-5 py-2 text-left font-medium">Marché</th>
                <th className="px-3 py-2 text-right font-medium">Probabilité estimée</th>
                <th className="px-3 py-2 text-right font-medium">Cote juste</th>
                <th className="px-3 py-2 text-right font-medium">Cote</th>
                <th className="px-3 py-2 text-right font-medium">Proba. implicite</th>
                <th className="px-3 py-2 text-right font-medium">Écart</th>
                <th className="px-3 py-2 text-left font-medium">Confiance</th>
                <th className="px-5 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MARKET_GROUP_ORDER.map((group) => {
                const list = markets.filter((m) => m.group === group);
                if (!list.length) return null;
                return (
                  <Fragment key={group}>
                    <tr>
                      <td colSpan={8} className="bg-surface-2/50 px-5 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {MARKET_GROUP_LABELS[group]}
                      </td>
                    </tr>
                    {list.map((m) => {
                      const id = selectionId(match.id, m.key);
                      const inSlip = mounted && selections.some((s) => s.id === id);
                      const isOpen = expanded === m.key;
                      const label = marketLabel(m.key, match.homeTeam.shortName, match.awayTeam.shortName);
                      return (
                        <Fragment key={m.key}>
                          <tr className={cn("border-b border-border transition-colors hover:bg-surface-2/50", isOpen && "bg-surface-2/40")}>
                            <td className="px-5 py-2.5">
                              <button type="button" onClick={() => setExpanded(isOpen ? null : m.key)} className="flex items-center gap-2 text-left font-medium" aria-expanded={isOpen}>
                                <ChevronDown className={cn("size-3.5 text-subtle-foreground transition-transform", isOpen && "rotate-180")} />
                                {label}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-surface-3 lg:block">
                                  <span className="block h-full rounded-full bg-primary" style={{ width: `${m.probability * 100}%` }} />
                                </span>
                                <span className="tabular font-semibold">{formatPercent(m.probability, 1)}</span>
                              </div>
                            </td>
                            <td className="tabular px-3 py-2.5 text-right text-muted-foreground">{formatOdds(m.fairOdds)}</td>
                            <td className="tabular px-3 py-2.5 text-right font-medium">
                              <span className="inline-flex items-center gap-1">
                                <OddsMove delta={movement(m.key)} />
                                {formatOdds(m.odds)}
                              </span>
                            </td>
                            <td className="tabular px-3 py-2.5 text-right text-muted-foreground">{formatPercent(m.impliedProbability, 1)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <EdgeBadge edge={m.edge} />
                            </td>
                            <td className="px-3 py-2.5">
                              <ConfidenceBadge level={m.confidence.level} score={m.confidence.score} short />
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <ExplainDialog
                                  matchId={match.id}
                                  marketKey={m.key}
                                  marketLabel={label}
                                  trigger={
                                    <Button variant="ghost" size="icon-sm" aria-label={`Expliquer ${label}`}>
                                      <Sparkles />
                                    </Button>
                                  }
                                />
                                <Hint label={canBet ? (inSlip ? "Retirer du combiné" : "Ajouter au combiné") : "Match déjà commencé ou terminé"}>
                                  <span>
                                    <Button
                                      variant={inSlip ? "default" : "secondary"}
                                      size="icon-sm"
                                      disabled={!canBet}
                                      onClick={() => onToggle(m)}
                                      aria-pressed={inSlip}
                                      aria-label={inSlip ? `Retirer ${label} du combiné` : `Ajouter ${label} au combiné`}
                                    >
                                      <Layers />
                                    </Button>
                                  </span>
                                </Hint>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-border bg-surface-2/30">
                              <td colSpan={8} className="px-5 py-4">
                                <MarketDetail m={m} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function OddsMove({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center text-[10px]", delta > 0 ? "text-info" : "text-warning")} title={`Cote ${delta > 0 ? "en hausse" : "en baisse"} de ${Math.abs(Math.round(delta * 100))} % depuis l'ouverture`}>
      <Icon className="size-3" />
      {Math.abs(Math.round(delta * 100))}%
    </span>
  );
}

function MarketDetail({ m }: { m: MarketEstimate }) {
  return (
    <div className="grid gap-4 text-sm md:grid-cols-3">
      <div className="md:col-span-2">
        <p className="leading-relaxed">{m.explanation}</p>
        {m.odds !== null && m.impliedProbability !== null && (
          <div className="mt-3 rounded-lg border border-border bg-surface p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Comparaison value</p>
            <div className="tabular mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <div className="text-subtle-foreground">Probabilité implicite</div>
                <div className="mt-0.5 font-medium">
                  1 / {formatOdds(m.odds)} = {formatPercent(m.impliedProbability, 1)}
                </div>
              </div>
              <div>
                <div className="text-subtle-foreground">Sans marge</div>
                <div className="mt-0.5 font-medium">{formatPercent(m.fairImpliedProbability, 1)}</div>
              </div>
              <div>
                <div className="text-subtle-foreground">Écart statistique</div>
                <div className={cn("mt-0.5 font-medium", (m.edge ?? 0) > 0 ? "text-positive" : "text-muted-foreground")}>{formatEdge(m.edge)}</div>
              </div>
              <div>
                <div className="text-subtle-foreground">Espérance théorique</div>
                <div className="mt-0.5 font-medium">{m.expectedValue !== null ? `${m.expectedValue > 0 ? "+" : ""}${formatPercent(m.expectedValue, 1)}` : "—"}</div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-subtle-foreground">
              Marge du bookmaker sur ce marché : {formatPercent(m.bookmakerMargin, 1)}. Information statistique : aucune garantie de gain.
            </p>
          </div>
        )}
      </div>
      <div className="space-y-3 text-xs">
        <div>
          <p className="mb-1 font-semibold text-muted-foreground">Données utilisées</p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            {m.dataUsed.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-semibold text-muted-foreground">Confiance statistique ({m.confidence.score}/100)</p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            {m.confidence.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        {m.probabilityGoalsModel !== null && (
          <div className="tabular text-muted-foreground">
            Modèle buts : {formatPercent(m.probabilityGoalsModel, 1)}
            {m.probabilityXgModel !== null && <> · Modèle xG : {formatPercent(m.probabilityXgModel, 1)}</>}
          </div>
        )}
      </div>
    </div>
  );
}
