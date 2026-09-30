"use client";

import { ArrowLeftRight, CircleDot, Radio, RectangleVertical, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { DemoBadge, LiveDot } from "@/components/common/badges";
import { useApp } from "@/components/layout/app-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Match, MatchEvent, TeamMatchStats } from "@/lib/domain/types";
import { formatNumber, formatOdds } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLive } from "./live-context";

const EVENT_META: Record<MatchEvent["type"], { label: string; icon: typeof CircleDot; cls: string }> = {
  goal: { label: "But", icon: CircleDot, cls: "text-positive" },
  penalty_goal: { label: "But (pén.)", icon: CircleDot, cls: "text-positive" },
  own_goal: { label: "But c.s.c.", icon: CircleDot, cls: "text-warning" },
  yellow: { label: "Carton jaune", icon: RectangleVertical, cls: "text-warning" },
  red: { label: "Carton rouge", icon: RectangleVertical, cls: "text-negative" },
  substitution: { label: "Remplacement", icon: ArrowLeftRight, cls: "text-muted-foreground" },
  var: { label: "VAR", icon: Radio, cls: "text-info" },
};

const STAT_ROWS: { key: keyof TeamMatchStats; label: string; pct?: boolean; decimals?: number }[] = [
  { key: "possession", label: "Possession", pct: true },
  { key: "xg", label: "xG", decimals: 2 },
  { key: "shots", label: "Tirs" },
  { key: "shotsOnTarget", label: "Tirs cadrés" },
  { key: "corners", label: "Corners" },
  { key: "fouls", label: "Fautes" },
  { key: "yellowCards", label: "Cartons jaunes" },
  { key: "redCards", label: "Cartons rouges" },
];

export function LivePanel({ match }: { match: Match }) {
  const { snapshot, connected, error, enabled, finished } = useLive();
  const { notifications } = useApp();
  const seen = useRef<Set<string> | null>(null);

  // Notification des nouveaux buts / cartons rouges (si activé dans les paramètres).
  useEffect(() => {
    if (!snapshot) return;
    if (seen.current === null) {
      seen.current = new Set(snapshot.events.map((e) => e.id));
      return;
    }
    for (const e of snapshot.events) {
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      if (!notifications.liveEvents) continue;
      if (e.type === "goal" || e.type === "penalty_goal" || e.type === "own_goal" || e.type === "red") {
        const team = e.side === "home" ? match.homeTeam.shortName : match.awayTeam.shortName;
        toast(`${EVENT_META[e.type].label} · ${team} (${e.minute}')`, {
          description: snapshot.score ? `${match.homeTeam.shortName} ${snapshot.score.home}-${snapshot.score.away} ${match.awayTeam.shortName}` : undefined,
        });
      }
    }
  }, [snapshot, notifications.liveEvents, match.homeTeam.shortName, match.awayTeam.shortName]);

  if (!enabled && !finished) return null;

  const events = snapshot?.events ?? [];
  const stats = snapshot?.stats;
  const liveOdds = snapshot?.odds;

  return (
    <Card className={cn(snapshot && (snapshot.status === "LIVE" || snapshot.status === "HALFTIME") && "border-live/30")}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            {snapshot?.status === "LIVE" || snapshot?.status === "HALFTIME" ? <LiveDot /> : null}
            {finished ? "Déroulé du match" : "Suivi en direct"}
          </CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            {finished ? null : connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {finished ? error ?? "Événements et statistiques finales" : connected ? "Connecté au flux temps réel" : error ?? "Mise à jour périodique"}
            {snapshot?.isDemo && <DemoBadge label="Simulation" className="ml-1" />}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!snapshot && error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !snapshot ? (
          <div className="space-y-2">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-24 w-full rounded-lg" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Événements</p>
              {events.filter((e) => e.type !== "substitution").length === 0 ? (
                <p className="text-sm text-subtle-foreground">Aucun événement pour le moment.</p>
              ) : (
                <ol className="relative space-y-2 border-l border-border pl-4">
                  {[...events]
                    .filter((e) => e.type !== "substitution")
                    .reverse()
                    .map((e) => {
                      const meta = EVENT_META[e.type];
                      const Icon = meta.icon;
                      return (
                        <li key={e.id} className="relative text-sm animate-in fade-in-0 slide-in-from-left-1">
                          <span className="absolute top-1.5 -left-[21px] size-2 rounded-full border-2 border-surface bg-border-strong" />
                          <span className="tabular mr-2 text-xs font-semibold text-muted-foreground">{e.minute}&apos;</span>
                          <Icon className={cn("mr-1 inline size-3.5", meta.cls)} />
                          <span className="font-medium">{meta.label}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {e.side === "home" ? match.homeTeam.shortName : match.awayTeam.shortName}
                            {e.player ? ` (${e.player})` : ""}
                          </span>
                        </li>
                      );
                    })}
                </ol>
              )}
            </div>
            <div className="lg:col-span-1">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Statistiques du match</p>
              {stats ? (
                <div className="space-y-2">
                  {STAT_ROWS.map((r) => {
                    const h = stats.home[r.key];
                    const a = stats.away[r.key];
                    if (h === null || a === null) return null;
                    const total = h + a || 1;
                    return (
                      <div key={r.key}>
                        <div className="tabular flex justify-between text-xs">
                          <span className="font-semibold">{r.pct ? `${h} %` : formatNumber(h, r.decimals ?? 0)}</span>
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-semibold">{r.pct ? `${a} %` : formatNumber(a, r.decimals ?? 0)}</span>
                        </div>
                        <div className="mt-1 flex h-1 gap-[2px] overflow-hidden rounded-full">
                          <span className="bg-home" style={{ width: `${(h / total) * 100}%` }} />
                          <span className="bg-away" style={{ width: `${(a / total) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-subtle-foreground">Statistiques live non fournies par la source.</p>
              )}
            </div>
            <div className="lg:col-span-1">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Cotes en direct</p>
              {liveOdds && Object.keys(liveOdds).length ? (
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["1X2_HOME", "1"],
                      ["1X2_DRAW", "X"],
                      ["1X2_AWAY", "2"],
                      ["OU_2_5_OVER", "+2.5"],
                      ["OU_2_5_UNDER", "−2.5"],
                    ] as const
                  ).map(([k, l]) => (
                    <div key={k} className="rounded-lg border border-border bg-surface-2/60 py-2 text-center">
                      <div className="text-[10px] text-subtle-foreground">{l}</div>
                      <div className="tabular text-sm font-semibold">{formatOdds(liveOdds[k] ?? null)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-subtle-foreground">{snapshot.status === "FINISHED" ? "Match terminé." : "Aucune cote live disponible."}</p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-subtle-foreground">
                Les cotes en direct évoluent très rapidement. Elles sont affichées à titre informatif uniquement.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
