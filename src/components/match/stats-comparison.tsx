import { InfoTip } from "@/components/common/info-tip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Team, TeamMatchRecord, TeamStatsSummary } from "@/lib/domain/types";
import { summarizeTeamRecords } from "@/lib/engine/team-stats";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  home: number | null;
  away: number | null;
  format: (v: number | null) => string;
  /** true si une valeur plus basse est meilleure (ex. buts encaissés). */
  lowerIsBetter?: boolean;
  tip?: string;
}

const n1 = (v: number | null) => formatNumber(v, 1);
const n2 = (v: number | null) => formatNumber(v, 2);
const pct = (v: number | null) => formatPercent(v);

function rows(h: TeamStatsSummary, a: TeamStatsSummary): { title: string; rows: Row[] }[] {
  return [
    {
      title: "Attaque & défense",
      rows: [
        { label: "Buts marqués / match", home: h.goalsForPerMatch, away: a.goalsForPerMatch, format: n2 },
        { label: "Buts encaissés / match", home: h.goalsAgainstPerMatch, away: a.goalsAgainstPerMatch, format: n2, lowerIsBetter: true },
        { label: "xG / match", home: h.xg, away: a.xg, format: n2, tip: "Buts attendus : qualité des occasions créées." },
        { label: "xGA / match", home: h.xga, away: a.xga, format: n2, lowerIsBetter: true, tip: "Buts attendus concédés." },
        { label: "Occasions nettes / match", home: h.bigChances, away: a.bigChances, format: n1 },
        { label: "Clean sheets", home: h.cleanSheetRate, away: a.cleanSheetRate, format: pct },
      ],
    },
    {
      title: "Jeu",
      rows: [
        { label: "Possession moyenne", home: h.possession !== null ? h.possession / 100 : null, away: a.possession !== null ? a.possession / 100 : null, format: pct },
        { label: "Tirs / match", home: h.shots, away: a.shots, format: n1 },
        { label: "Tirs cadrés / match", home: h.shotsOnTarget, away: a.shotsOnTarget, format: n1 },
        { label: "Corners obtenus / match", home: h.corners, away: a.corners, format: n1 },
        { label: "Corners concédés / match", home: h.cornersAgainst, away: a.cornersAgainst, format: n1, lowerIsBetter: true },
        { label: "Cartons / match", home: h.cards, away: a.cards, format: n1, lowerIsBetter: true },
      ],
    },
    {
      title: "Tendances de buts",
      rows: [
        { label: "BTTS", home: h.bttsRate, away: a.bttsRate, format: pct },
        { label: "Over 1.5", home: h.over15Rate, away: a.over15Rate, format: pct },
        { label: "Over 2.5", home: h.over25Rate, away: a.over25Rate, format: pct },
        { label: "Over 3.5", home: h.over35Rate, away: a.over35Rate, format: pct },
        { label: "Matchs sans marquer", home: h.failedToScoreRate, away: a.failedToScoreRate, format: pct, lowerIsBetter: true },
      ],
    },
  ];
}

function CompareRow({ row }: { row: Row }) {
  const { home, away } = row;
  const available = home !== null && away !== null;
  const total = available ? Math.abs(home) + Math.abs(away) : 0;
  const hShare = available && total > 0 ? Math.abs(home) / total : 0.5;
  const better = !available || home === away ? null : (home > away) !== Boolean(row.lowerIsBetter) ? "home" : "away";
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className={cn("tabular w-16 font-semibold", better === "home" && "text-home")}>{row.format(home)}</span>
        <span className="flex items-center gap-1 text-center text-xs text-muted-foreground">
          {row.label}
          {row.tip && <InfoTip>{row.tip}</InfoTip>}
        </span>
        <span className={cn("tabular w-16 text-right font-semibold", better === "away" && "text-away")}>{row.format(away)}</span>
      </div>
      {available ? (
        <div className="flex h-1.5 gap-[2px]">
          <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-surface-3">
            <span className={cn("h-full rounded-l-full", better === "home" ? "bg-home" : "bg-home/45")} style={{ width: `${hShare * 100}%` }} />
          </div>
          <div className="flex flex-1 overflow-hidden rounded-r-full bg-surface-3">
            <span className={cn("h-full rounded-r-full", better === "away" ? "bg-away" : "bg-away/45")} style={{ width: `${(1 - hShare) * 100}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-center text-[11px] text-subtle-foreground">Donnée non fournie par la source</p>
      )}
    </div>
  );
}

export function StatsComparison({ home, away, homeRecords, awayRecords }: { home: Team; away: Team; homeRecords: TeamMatchRecord[]; awayRecords: TeamMatchRecord[] }) {
  const all = rows(summarizeTeamRecords(home.id, homeRecords), summarizeTeamRecords(away.id, awayRecords));
  const venue = rows(
    summarizeTeamRecords(home.id, homeRecords.filter((r) => r.venue === "home")),
    summarizeTeamRecords(away.id, awayRecords.filter((r) => r.venue === "away")),
  )[0];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {all.map((g) => (
        <Card key={g.title}>
          <CardHeader>
            <div>
              <CardTitle>{g.title}</CardTitle>
              <CardDescription>
                <span className="text-home">{home.shortName}</span> vs <span className="text-away">{away.shortName}</span> · {homeRecords.length}/{awayRecords.length} matchs
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border pt-2">
            {g.rows.map((r) => (
              <CompareRow key={r.label} row={r} />
            ))}
          </CardContent>
        </Card>
      ))}
      <Card className="lg:col-span-3">
        <CardHeader>
          <div>
            <CardTitle>Performances domicile / extérieur</CardTitle>
            <CardDescription>
              {home.shortName} à domicile vs {away.shortName} à l&apos;extérieur
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-x-8 pt-2 md:grid-cols-2">
          {venue.rows.map((r) => (
            <CompareRow key={r.label} row={r} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
