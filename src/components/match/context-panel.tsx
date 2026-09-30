import { AlertTriangle, CalendarClock, CircleCheck, CircleHelp, Home, Stethoscope, Swords, TrendingUp, Trophy, type LucideIcon } from "lucide-react";
import { TeamCrest } from "@/components/common/team-crest";
import { FormBadges } from "@/components/common/form-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Standings, Team } from "@/lib/domain/types";
import type { MatchAnalysis } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  venue: Home,
  form: TrendingUp,
  schedule: CalendarClock,
  availability: Stethoscope,
  h2h: Swords,
  importance: Trophy,
};

export function ContextPanel({ analysis }: { analysis: MatchAnalysis }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {analysis.context.map((c) => {
          const Icon = ICONS[c.key] ?? CircleHelp;
          return (
            <div
              key={c.key}
              className={cn(
                "card-surface rounded-xl p-4",
                c.tone === "warning" && "border-warning/30",
                c.tone === "home" && "border-home/30",
                c.tone === "away" && "border-away/30",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                {!c.available && <span className="ml-auto text-[10px] text-subtle-foreground">Non disponible</span>}
              </div>
              <p className="mt-3 text-sm font-semibold">{c.value}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
            </div>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Qualité des données</CardTitle>
            <CardDescription>Score {analysis.dataQuality.score}/100 · base de la confiance statistique</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {analysis.dataQuality.items.map((i) => (
            <div key={i.label} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2">
              {i.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-positive" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />}
              <div>
                <p className="text-sm font-medium">{i.label}</p>
                <p className="text-xs text-muted-foreground">{i.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {(analysis.warnings.length > 0 || analysis.limitations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Avertissements & limites du modèle</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {[...analysis.warnings, ...analysis.limitations].map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle-foreground" />
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function StandingsTable({ standings, highlight }: { standings: Standings; highlight: [Team, Team] }) {
  const ids = new Set(highlight.map((t) => t.id));
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Classement</CardTitle>
          <CardDescription>{standings.season}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-3 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] text-subtle-foreground uppercase">
                <th className="w-10 px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Équipe</th>
                <th className="px-2 py-2 text-right font-medium">J</th>
                <th className="px-2 py-2 text-right font-medium">V</th>
                <th className="px-2 py-2 text-right font-medium">N</th>
                <th className="px-2 py-2 text-right font-medium">D</th>
                <th className="px-2 py-2 text-right font-medium">Diff</th>
                <th className="px-2 py-2 text-right font-medium">Pts</th>
                <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Forme</th>
              </tr>
            </thead>
            <tbody>
              {standings.rows.map((r) => (
                <tr key={r.team.id} className={cn("border-b border-border last:border-0", ids.has(r.team.id) && "bg-primary-soft")}>
                  <td className="tabular px-3 py-2 text-muted-foreground">{r.position}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <TeamCrest team={r.team} size="xs" />
                      <span className={cn("truncate", ids.has(r.team.id) && "font-semibold")}>{r.team.name}</span>
                    </span>
                  </td>
                  <td className="tabular px-2 py-2 text-right">{r.played}</td>
                  <td className="tabular px-2 py-2 text-right">{r.won}</td>
                  <td className="tabular px-2 py-2 text-right">{r.drawn}</td>
                  <td className="tabular px-2 py-2 text-right">{r.lost}</td>
                  <td className="tabular px-2 py-2 text-right text-muted-foreground">
                    {r.goalsFor - r.goalsAgainst > 0 ? "+" : ""}
                    {r.goalsFor - r.goalsAgainst}
                  </td>
                  <td className="tabular px-2 py-2 text-right font-semibold">{r.points}</td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    <FormBadges form={r.form} size="xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
