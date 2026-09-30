import Link from "next/link";
import { FormBadges } from "@/components/common/form-badges";
import { TeamCrest } from "@/components/common/team-crest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Team, TeamMatchRecord } from "@/lib/domain/types";
import { summarizeTeamRecords } from "@/lib/engine/team-stats";
import { RESULT_LABEL, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const RESULT_CLS = { W: "bg-positive/15 text-positive", D: "bg-draw/15 text-muted-foreground", L: "bg-negative/15 text-negative" };

function TeamForm({ team, records: all, tz, side }: { team: Team; records: TeamMatchRecord[]; tz: string; side: "home" | "away" }) {
  const records = all.slice(0, 10);
  const s = summarizeTeamRecords(team.id, records);
  const maxGoals = Math.max(3, ...records.map((r) => Math.max(r.goalsFor, r.goalsAgainst)));
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <TeamCrest team={team} size="md" />
          <div>
            <CardTitle>{team.name}</CardTitle>
            <CardDescription>{records.length} derniers matchs</CardDescription>
          </div>
        </div>
        <FormBadges form={records.slice(0, 5).map((r) => r.result)} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { l: "V", v: s.wins, c: "text-positive" },
            { l: "N", v: s.draws, c: "text-muted-foreground" },
            { l: "D", v: s.losses, c: "text-negative" },
            { l: "Buts +", v: records.reduce((a, r) => a + r.goalsFor, 0), c: "" },
            { l: "Buts −", v: records.reduce((a, r) => a + r.goalsAgainst, 0), c: "" },
          ].map((x) => (
            <div key={x.l} className="rounded-lg border border-border bg-surface-2/50 py-2">
              <div className={cn("tabular text-xl font-semibold", x.c)}>{x.v}</div>
              <div className="text-[10px] text-subtle-foreground uppercase">{x.l}</div>
            </div>
          ))}
        </div>

        {/* Buts marqués / encaissés par match (du plus ancien au plus récent) */}
        <div>
          <div className="mb-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-sm", side === "home" ? "bg-home" : "bg-away")} /> Marqués
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-draw" /> Encaissés
            </span>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {[...records].reverse().map((r) => (
              <div key={r.matchId} className="flex h-full flex-1 flex-col justify-end gap-[2px]" title={`${r.opponent.shortName} ${r.goalsFor}-${r.goalsAgainst}`}>
                <div className="flex flex-1 items-end justify-center gap-[2px]">
                  <span className={cn("w-1/2 max-w-3 rounded-t-[3px]", side === "home" ? "bg-home" : "bg-away")} style={{ height: `${(r.goalsFor / maxGoals) * 100}%`, minHeight: r.goalsFor ? 4 : 0 }} />
                  <span className="w-1/2 max-w-3 rounded-t-[3px] bg-draw" style={{ height: `${(r.goalsAgainst / maxGoals) * 100}%`, minHeight: r.goalsAgainst ? 4 : 0 }} />
                </div>
                <span className={cn("mx-auto flex size-4 items-center justify-center rounded text-[9px] font-semibold", RESULT_CLS[r.result])}>{RESULT_LABEL[r.result]}</span>
              </div>
            ))}
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {records.map((r) => (
            <li key={r.matchId}>
              <Link href={`/matches/${encodeURIComponent(r.matchId)}`} className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-2">
                <span className="tabular w-12 shrink-0 text-xs text-subtle-foreground">{formatDate(r.date, tz)}</span>
                <span className="w-7 shrink-0 text-[10px] text-subtle-foreground uppercase">{r.venue === "home" ? "Dom" : "Ext"}</span>
                <TeamCrest team={r.opponent} size="xs" />
                <span className="min-w-0 flex-1 truncate">{r.opponent.name}</span>
                {r.stats?.xg != null && (
                  <span className="tabular hidden text-[11px] text-subtle-foreground sm:inline">
                    xG {formatNumber(r.stats.xg, 1)}–{formatNumber(r.opponentStats?.xg ?? null, 1)}
                  </span>
                )}
                <span className="tabular w-10 text-right font-semibold">
                  {r.goalsFor}-{r.goalsAgainst}
                </span>
                <span className={cn("flex size-5 items-center justify-center rounded text-[10px] font-semibold", RESULT_CLS[r.result])}>{RESULT_LABEL[r.result]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function FormPanel({ home, away, homeRecords, awayRecords, tz }: { home: Team; away: Team; homeRecords: TeamMatchRecord[]; awayRecords: TeamMatchRecord[]; tz: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TeamForm team={home} records={homeRecords} tz={tz} side="home" />
      <TeamForm team={away} records={awayRecords} tz={tz} side="away" />
    </div>
  );
}
