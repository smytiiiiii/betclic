import { Swords } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/states";
import { TeamCrest } from "@/components/common/team-crest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeadToHeadMatch, Team } from "@/lib/domain/types";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function H2HList({ h2h, home, away, tz }: { h2h: HeadToHeadMatch[]; home: Team; away: Team; tz: string }) {
  if (!h2h.length) {
    return <EmptyState icon={Swords} title="Aucune confrontation récente" description="La source ne fournit pas de face-à-face récent entre ces deux équipes." />;
  }
  let w = 0;
  let d = 0;
  let l = 0;
  let goals = 0;
  for (const m of h2h) {
    const isHome = m.homeTeam.id === home.id;
    const gf = isHome ? m.score.home : m.score.away;
    const ga = isHome ? m.score.away : m.score.home;
    goals += gf + ga;
    if (gf > ga) w++;
    else if (gf < ga) l++;
    else d++;
  }
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Confrontations directes</CardTitle>
          <CardDescription>
            {h2h.length} derniers face-à-face · {formatNumber(goals / h2h.length, 2)} buts/match en moyenne
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-surface-2/50 py-3">
            <div className="tabular text-2xl font-semibold text-home">{w}</div>
            <div className="truncate px-2 text-[11px] text-muted-foreground">Victoires {home.shortName}</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-2/50 py-3">
            <div className="tabular text-2xl font-semibold">{d}</div>
            <div className="text-[11px] text-muted-foreground">Nuls</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-2/50 py-3">
            <div className="tabular text-2xl font-semibold text-away">{l}</div>
            <div className="truncate px-2 text-[11px] text-muted-foreground">Victoires {away.shortName}</div>
          </div>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {h2h.map((m) => (
            <li key={m.matchId}>
              <Link href={`/matches/${encodeURIComponent(m.matchId)}`} className="grid grid-cols-[64px_1fr_auto_1fr] items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-surface-2">
                <span className="tabular text-xs text-subtle-foreground">{formatDate(m.date, tz, { day: "numeric", month: "short", year: "2-digit" })}</span>
                <span className={cn("flex items-center justify-end gap-2 truncate text-right", m.score.home > m.score.away && "font-semibold")}>
                  <span className="truncate">{m.homeTeam.shortName}</span>
                  <TeamCrest team={m.homeTeam} size="xs" />
                </span>
                <span className="tabular rounded-md bg-surface-3 px-2 py-0.5 text-center font-semibold">
                  {m.score.home} - {m.score.away}
                </span>
                <span className={cn("flex items-center gap-2 truncate", m.score.away > m.score.home && "font-semibold")}>
                  <TeamCrest team={m.awayTeam} size="xs" />
                  <span className="truncate">{m.awayTeam.shortName}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
