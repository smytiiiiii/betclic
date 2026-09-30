import { InfoTip } from "@/components/common/info-tip";
import { ConfidenceBadge } from "@/components/common/badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchAnalysis } from "@/lib/engine/types";
import type { Match } from "@/lib/domain/types";
import { formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProbabilityOverview({ analysis, match }: { analysis: MatchAnalysis; match: Match }) {
  const m = (k: string) => analysis.markets.find((x) => x.key === k);
  const outcomes = [
    { key: "1X2_HOME", label: match.homeTeam.shortName, sub: "Victoire domicile", color: "bg-home", text: "text-home" },
    { key: "1X2_DRAW", label: "Match nul", sub: "Nul", color: "bg-draw", text: "text-muted-foreground" },
    { key: "1X2_AWAY", label: match.awayTeam.shortName, sub: "Victoire extérieur", color: "bg-away", text: "text-away" },
  ];
  const quick = ["OU_1_5_OVER", "OU_2_5_OVER", "OU_3_5_OVER", "BTTS_YES"];
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            Probabilités statistiques estimées
            <InfoTip>Estimations issues d&apos;un modèle de Poisson corrigé (Dixon-Coles). Une probabilité n&apos;est jamais une certitude.</InfoTip>
          </CardTitle>
          <CardDescription>Analyse pré-match · données antérieures au coup d&apos;envoi uniquement</CardDescription>
        </div>
        <ConfidenceBadge level={analysis.dataQuality.level} score={analysis.dataQuality.score} short />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {outcomes.map((o) => {
            const market = m(o.key);
            if (!market) return null;
            return (
              <div key={o.key} className="rounded-xl border border-border bg-surface-2/60 p-3 md:p-4">
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", o.color)} />
                  <span className="truncate text-xs font-medium text-muted-foreground">{o.label}</span>
                </div>
                <div className="tabular mt-2 text-2xl font-semibold tracking-tight md:text-4xl">{formatPercent(market.probability)}</div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full", o.color)} style={{ width: `${market.probability * 100}%` }} />
                </div>
                <div className="tabular mt-2 flex flex-wrap justify-between gap-x-2 text-[11px] text-subtle-foreground">
                  <span>Cote juste {formatOdds(market.fairOdds)}</span>
                  {market.odds && <span>Cote {formatOdds(market.odds)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {quick.map((k) => {
            const market = m(k);
            if (!market) return null;
            return (
              <div key={k} className="rounded-lg border border-border px-3 py-2.5">
                <div className="text-[11px] text-muted-foreground">{market.label}</div>
                <div className="tabular mt-0.5 text-lg font-semibold">{formatPercent(market.probability)}</div>
              </div>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Scores exacts les plus probables</p>
          <div className="flex flex-wrap gap-2">
            {analysis.topScores.map((s) => (
              <span key={`${s.home}-${s.away}`} className="tabular inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5 text-sm">
                <span className="font-semibold">
                  {s.home}-{s.away}
                </span>
                <span className="text-xs text-muted-foreground">{formatPercent(s.probability, 1)}</span>
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
