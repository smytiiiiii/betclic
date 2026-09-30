import type { Metadata } from "next";
import { AlertTriangle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ResponsibleNotice } from "@/components/common/responsible-notice";
import { ErrorState } from "@/components/common/states";
import { OddsMovementChart } from "@/components/charts/odds-movement-chart";
import { ScoreMatrix } from "@/components/charts/score-matrix";
import { ContextPanel, StandingsTable } from "@/components/match/context-panel";
import { FactorsCard } from "@/components/match/factors-card";
import { FormPanel } from "@/components/match/form-panel";
import { H2HList } from "@/components/match/h2h-list";
import { LiveMatchProvider } from "@/components/match/live-context";
import { LivePanel } from "@/components/match/live-panel";
import { MarketsTable } from "@/components/match/markets-table";
import { MatchHero } from "@/components/match/match-hero";
import { MatchTabs, type TabDef } from "@/components/match/match-tabs";
import { ProbabilityOverview } from "@/components/match/probability-overview";
import { StatsComparison } from "@/components/match/stats-comparison";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/config/env";
import { settleMarket } from "@/lib/domain/markets";
import type { MatchAnalysis } from "@/lib/engine/types";
import type { Match } from "@/lib/domain/types";
import { formatPercent } from "@/lib/format";
import { getMatchDetail } from "@/lib/services/analysis";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/matches/[id]">): Promise<Metadata> {
  const { id } = await params;
  const detail = await getMatchDetail(decodeURIComponent(id));
  if (!detail) return { title: "Match introuvable" };
  return { title: `${detail.match.homeTeam.name} – ${detail.match.awayTeam.name}` };
}

function PostMatchReview({ match, analysis }: { match: Match; analysis: MatchAnalysis }) {
  if (match.status !== "FINISHED" || !match.score) return null;
  const keys = ["1X2_HOME", "1X2_DRAW", "1X2_AWAY", "OU_2_5_OVER", "OU_2_5_UNDER", "BTTS_YES", "BTTS_NO"] as const;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Bilan : estimation pré-match vs résultat</CardTitle>
          <CardDescription>
            Score final {match.score.home}-{match.score.away}. Un événement estimé à 30 % se produit environ 3 fois sur 10 : un résultat isolé ne valide ni
            n&apos;invalide un modèle.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {keys.map((k) => {
          const m = analysis.markets.find((x) => x.key === k);
          if (!m) return null;
          const won = settleMarket(k, match.score!, null);
          return (
            <div key={k} className={cn("rounded-lg border px-3 py-2", won ? "border-positive/30 bg-positive/5" : "border-border")}>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                {m.label}
                {won ? <CheckCircle2 className="size-3.5 text-positive" /> : <XCircle className="size-3.5 text-subtle-foreground" />}
              </div>
              <div className="tabular mt-1 text-lg font-semibold">{formatPercent(m.probability)}</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function MatchPage({ params }: PageProps<"/matches/[id]">) {
  await connection();
  const { id } = await params;
  const detail = await getMatchDetail(decodeURIComponent(id));
  if (!detail) notFound();

  const { match, analysis, homeRecords, awayRecords, h2h, odds, standings } = detail;
  const tz = env().APP_TIMEZONE;
  const position = (teamId: string) => standings?.rows.find((r) => r.team.id === teamId)?.position ?? null;
  const live = match.status === "LIVE" || match.status === "HALFTIME";

  const tabs: TabDef[] = [];
  if (analysis) {
    tabs.push({
      value: "overview",
      label: "Analyse",
      icon: "overview",
      content: (
        <div className="space-y-4">
          <PostMatchReview match={match} analysis={analysis} />
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <ProbabilityOverview analysis={analysis} match={match} />
            </div>
            <div className="xl:col-span-2">
              <FactorsCard analysis={analysis} match={match} />
            </div>
          </div>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Matrice des scores</CardTitle>
                <CardDescription>Probabilité estimée de chaque score exact (loi de Poisson corrigée Dixon-Coles)</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ScoreMatrix matrix={analysis.scoreMatrix} homeName={match.homeTeam.shortName} awayName={match.awayTeam.shortName} />
            </CardContent>
          </Card>
        </div>
      ),
    });
    tabs.push({
      value: "markets",
      label: "Marchés & value",
      icon: "markets",
      content: (
        <div className="space-y-4">
          <MarketsTable markets={analysis.markets} match={match} odds={odds} />
          {odds && odds.history.length > 1 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Évolution des cotes 1X2</CardTitle>
                  <CardDescription>
                    {odds.bookmaker}
                    {odds.isDemo && " · cotes fictives de démonstration"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <OddsMovementChart history={odds.history} homeName={match.homeTeam.shortName} awayName={match.awayTeam.shortName} timezone={tz} />
              </CardContent>
            </Card>
          )}
        </div>
      ),
    });
  }
  if (live || match.status === "FINISHED") {
    tabs.push({ value: "live", label: live ? "En direct" : "Déroulé", icon: "live", content: <LivePanel match={match} /> });
  }
  tabs.push({
    value: "form",
    label: "Forme",
    icon: "form",
    content: <FormPanel home={match.homeTeam} away={match.awayTeam} homeRecords={homeRecords} awayRecords={awayRecords} tz={tz} />,
  });
  tabs.push({
    value: "stats",
    label: "Statistiques",
    icon: "stats",
    content: <StatsComparison home={match.homeTeam} away={match.awayTeam} homeRecords={homeRecords} awayRecords={awayRecords} />,
  });
  tabs.push({ value: "h2h", label: "Confrontations", icon: "h2h", content: <H2HList h2h={h2h} home={match.homeTeam} away={match.awayTeam} tz={tz} /> });
  if (analysis) {
    tabs.push({
      value: "context",
      label: "Contexte",
      icon: "context",
      content: (
        <div className="space-y-4">
          <ContextPanel analysis={analysis} />
          {standings && <StandingsTable standings={standings} highlight={[match.homeTeam, match.awayTeam]} />}
        </div>
      ),
    });
  }

  return (
    <LiveMatchProvider matchId={match.id} status={match.status} kickoff={match.kickoff}>
      <div className="space-y-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/matches">
            <ArrowLeft /> Matchs
          </Link>
        </Button>
        <MatchHero
          match={match}
          homeForm={analysis?.profiles.home.form ?? homeRecords.slice(0, 5).map((r) => r.result)}
          awayForm={analysis?.profiles.away.form ?? awayRecords.slice(0, 5).map((r) => r.result)}
          homePosition={position(match.homeTeam.id)}
          awayPosition={position(match.awayTeam.id)}
          expectedGoals={analysis ? { home: analysis.expectedGoals.home, away: analysis.expectedGoals.away } : null}
        />
        {!analysis && (
          <ErrorState
            title="Analyse indisponible"
            description={detail.analysisError ?? "Les données nécessaires ne sont pas disponibles."}
            action={
              <Button asChild variant="secondary">
                <Link href="/matches">Retour aux matchs</Link>
              </Button>
            }
          />
        )}
        {analysis && analysis.warnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{analysis.warnings.join(" ")}</span>
          </div>
        )}
        <MatchTabs tabs={tabs} defaultValue={live ? "live" : tabs[0].value} />
        <ResponsibleNotice />
      </div>
    </LiveMatchProvider>
  );
}
