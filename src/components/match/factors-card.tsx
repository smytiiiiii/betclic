import { InfoTip } from "@/components/common/info-tip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Match } from "@/lib/domain/types";
import type { MatchAnalysis } from "@/lib/engine/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Score analytique et contribution signée de chaque facteur (barres divergentes). */
export function FactorsCard({ analysis, match }: { analysis: MatchAnalysis; match: Match }) {
  const { home, away } = analysis.analyticalScore;
  const maxAbs = Math.max(0.05, ...analysis.factors.map((f) => Math.abs(f.contribution)));
  const adj = analysis.expectedGoals.adjustment;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            Score analytique
            <InfoTip>
              Indice composite 0-100 pondéré (pondérations configurables dans Paramètres). Les facteurs indisponibles sont exclus et leur poids redistribué.
            </InfoTip>
          </CardTitle>
          <CardDescription>Facteurs ayant contribué au résultat</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">{match.homeTeam.shortName}</div>
            <div className="tabular text-4xl font-semibold text-home">{home}</div>
          </div>
          <div className="flex-1 pb-3">
            <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
              <span className="bg-home" style={{ width: `${home}%` }} />
              <span className="bg-away" style={{ width: `${away}%` }} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{match.awayTeam.shortName}</div>
            <div className="tabular text-4xl font-semibold text-away">{away}</div>
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex justify-between px-2 text-[10px] text-subtle-foreground uppercase">
            <span>← favorise {match.awayTeam.shortName}</span>
            <span>favorise {match.homeTeam.shortName} →</span>
          </div>
          {analysis.factors.map((f) => {
            const width = (Math.abs(f.contribution) / maxAbs) * 50;
            return (
              <div key={f.key} className={cn("rounded-lg px-2 py-2 transition-colors hover:bg-surface-2", !f.available && "opacity-55")} title={f.detail}>
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      {f.label}
                      {f.adjustsExpectedGoals && f.available && (
                        <span className="text-[9px] tracking-wide text-primary uppercase" title="Ce facteur ajuste les buts attendus">
                          λ
                        </span>
                      )}
                    </div>
                    <div className="tabular text-[10px] text-subtle-foreground">
                      {f.available ? `Poids ${formatPercent(f.normalizedWeight)} (config. ${f.weight})` : "Non disponible"}
                    </div>
                  </div>
                  <div className="tabular shrink-0 text-right text-[11px] leading-tight">
                    {f.available ? (
                      <>
                        <div className="text-home">{f.homeDisplay}</div>
                        <div className="text-away">{f.awayDisplay}</div>
                      </>
                    ) : (
                      <span className="text-subtle-foreground">—</span>
                    )}
                  </div>
                </div>
                <div className="relative mt-1.5 h-2 rounded-full bg-surface-3/60">
                  <div className="absolute -top-0.5 -bottom-0.5 left-1/2 w-px bg-border-strong" />
                  {f.available && f.contribution !== 0 && (
                    <div
                      className={cn("absolute top-0 bottom-0", f.contribution > 0 ? "rounded-r-full bg-home" : "rounded-l-full bg-away")}
                      style={f.contribution > 0 ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
                    />
                  )}
                </div>
                {!f.available && <p className="mt-1 text-[11px] text-subtle-foreground">{f.detail}</p>}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <Badge variant="outline">λ</Badge>
          Forme, confrontations, disponibilité et repos ajustent les buts attendus (non capturés par le modèle de buts) :
          <span className="tabular font-medium text-foreground">
            ×{adj.toFixed(3)} domicile / ×{(1 / adj).toFixed(3)} extérieur
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
