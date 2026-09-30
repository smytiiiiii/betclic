import { Activity, AlertTriangle, ArrowRight, BarChart3, BrainCircuit, CalendarDays, Calculator, Info, Siren, Sigma, Target } from "lucide-react";
import Link from "next/link";
import { DemoBadge, EdgeBadge } from "@/components/common/badges";
import { KpiCard } from "@/components/common/kpi-card";
import { SectionTitle } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { TeamCrest } from "@/components/common/team-crest";
import { CalibrationChart } from "@/components/charts/calibration-chart";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { MatchRow, MatchRowSkeleton } from "@/components/matches/match-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/config/env";
import { formatDateTime, formatInteger, formatNumber, formatOdds, formatPercent, formatUnits } from "@/lib/format";
import { getBacktest } from "@/lib/services/backtest";
import { getDashboardData } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

const tz = () => env().APP_TIMEZONE;

export async function KpiRow() {
  const [d, bt] = await Promise.all([getDashboardData(), getBacktest()]);
  const analysedToday = d.todayCards.filter((c) => c.probabilities).length;
  const betterThanMarket = bt.market ? bt.model.brier < bt.market.brier : null;
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
      <KpiCard
        label="Matchs analysés aujourd'hui"
        value={formatInteger(analysedToday)}
        sub={`sur ${d.todayCards.length} programmé${d.todayCards.length > 1 ? "s" : ""}`}
        icon={CalendarDays}
        tip="Matchs du jour disposant d'un historique suffisant (≥ 3 matchs par équipe)."
      />
      <KpiCard label="Analyses disponibles" value={formatInteger(d.analysesAvailable)} sub="aujourd'hui + 3 jours" icon={BrainCircuit} />
      <KpiCard
        label="Probabilités calculées"
        value={formatInteger(d.probabilitiesComputed)}
        sub="marchés estimés aujourd'hui"
        icon={Calculator}
        tip="1X2, double chance, over/under, BTTS et corners pour chaque match analysé."
      />
      <KpiCard
        label="Prédictions historiques"
        value={formatInteger(bt.matchesEvaluated)}
        sub={`matchs backtestés · ${env().BACKTEST_DAYS} j`}
        icon={Sigma}
        badge={bt.isDemo ? <DemoBadge /> : undefined}
        tip="Nombre de matchs terminés ré-analysés avec les seules données disponibles avant le coup d'envoi."
      />
      <KpiCard
        className="col-span-2 lg:col-span-1"
        label="Résultats du modèle"
        value={formatNumber(bt.model.brier, 3)}
        sub={bt.market ? `Brier marché : ${formatNumber(bt.market.brier, 3)}` : "Score de Brier 1X2"}
        icon={Activity}
        tone={betterThanMarket === null ? "default" : betterThanMarket ? "positive" : "default"}
        badge={bt.isDemo ? <DemoBadge /> : undefined}
        tip="Score de Brier multi-classes sur le 1X2 (plus bas = meilleur), comparé aux probabilités implicites des cotes de clôture sans marge."
      />
    </div>
  );
}

export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={cn("card-surface h-[124px] rounded-xl p-5", i === 4 && "col-span-2 lg:col-span-1")}>
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton mt-5 h-8 w-20 rounded" />
          <div className="skeleton mt-3 h-3 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

export async function TodayMatches() {
  const d = await getDashboardData();
  const cards = d.todayCards.slice(0, 9);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Matchs du jour</CardTitle>
          <CardDescription>
            {d.todayCards.length} match{d.todayCards.length > 1 ? "s" : ""}
            {d.liveCount > 0 && <span className="text-live"> · {d.liveCount} en direct</span>}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/matches">
            Tout voir <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <div className="mt-3 divide-y divide-border px-1 pb-1">
        {cards.length ? (
          cards.map((c) => <MatchRow key={c.match.id} card={c} tz={tz()} showOdds={false} />)
        ) : (
          <div className="p-4">
            <EmptyState icon={CalendarDays} title="Aucun match aujourd'hui" description="Consultez les prochains jours depuis la page Matchs." />
          </div>
        )}
      </div>
    </Card>
  );
}

export function ListSkeleton({ rows = 6, title }: { rows?: number; title?: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        {title ? <CardTitle>{title}</CardTitle> : <div className="skeleton h-4 w-32 rounded" />}
      </CardHeader>
      <div className="mt-3 divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <MatchRowSkeleton key={i} />
        ))}
      </div>
    </Card>
  );
}

const ALERT_STYLES = {
  info: { icon: Info, cls: "text-info bg-info/10 border-info/20" },
  warning: { icon: AlertTriangle, cls: "text-warning bg-warning/10 border-warning/20" },
  critical: { icon: Siren, cls: "text-negative bg-negative/10 border-negative/20" },
};

export async function AlertsCard() {
  const d = await getDashboardData();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Alertes importantes</CardTitle>
          <CardDescription>Données, bankroll et jeu responsable</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {d.alerts.length === 0 && <p className="text-sm text-muted-foreground">Aucune alerte pour le moment.</p>}
        {d.alerts.map((a) => {
          const s = ALERT_STYLES[a.level];
          const Icon = s.icon;
          const body = (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/50 p-3 transition-colors hover:border-border-strong">
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md border", s.cls)}>
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.message}</p>
              </div>
            </div>
          );
          return a.href ? (
            <Link key={a.id} href={a.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={a.id}>{body}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export async function TopOpportunities() {
  const d = await getDashboardData();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4 text-primary" /> Écarts statistiques
          </CardTitle>
          <CardDescription>Probabilité modèle vs probabilité implicite</CardDescription>
        </div>
        <Badge variant="primary" className="tabular">
          {d.opportunitiesCount}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1 px-2 pb-2">
        {d.topOpportunities.length === 0 && (
          <p className="px-3 pb-3 text-sm text-muted-foreground">Aucun écart au-dessus de vos seuils sur les prochains jours.</p>
        )}
        {d.topOpportunities.map((o) => (
          <Link key={o.id} href={`/matches/${encodeURIComponent(o.match.id)}#markets`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2">
            <div className="flex -space-x-1.5">
              <TeamCrest team={o.match.homeTeam} size="xs" />
              <TeamCrest team={o.match.awayTeam} size="xs" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{o.marketLabel}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {o.match.homeTeam.shortName} – {o.match.awayTeam.shortName} · {formatDateTime(o.match.kickoff, tz())}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <EdgeBadge edge={o.edge} />
              <span className="tabular text-[11px] text-subtle-foreground">
                {formatPercent(o.probability)} vs {formatPercent(o.impliedProbability)} · @{formatOdds(o.odds)}
              </span>
            </div>
          </Link>
        ))}
        <div className="px-2 pt-1">
          <Button asChild variant="secondary" size="sm" className="w-full">
            <Link href="/opportunities">
              Toutes les opportunités <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export async function PerformanceSection() {
  const bt = await getBacktest();
  const vp = bt.valuePicks;
  return (
    <section>
      <SectionTitle
        title="Performances historiques du modèle"
        description={`Backtest walk-forward sur ${env().BACKTEST_DAYS} jours : chaque match est ré-analysé avec les seules données antérieures au coup d'envoi.`}
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">
              Historique <ArrowRight />
            </Link>
          </Button>
        }
      />
      {bt.isDemo && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Backtest calculé sur des <strong>données de démonstration fictives</strong> : ces chiffres illustrent le fonctionnement du moteur et ne constituent en
            aucun cas une performance réelle.
          </span>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Profit cumulé des sélections du modèle</CardTitle>
              <CardDescription>
                Mise fixe d&apos;1 unité sur chaque marché avec écart ≥ {bt.settingsMinEdge} pts (cotes de clôture)
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={cn("tabular text-xl font-semibold", vp.profit >= 0 ? "text-positive" : "text-negative")}>{formatUnits(vp.profit)}</div>
              <div className="tabular text-[11px] text-muted-foreground">ROI {formatPercent(vp.roi, 1)}</div>
            </div>
          </CardHeader>
          <CardContent>
            {bt.series.length > 1 ? (
              <PerformanceChart data={bt.series} />
            ) : (
              <EmptyState icon={BarChart3} title="Pas assez de sélections" description="Aucune sélection n'a atteint vos seuils sur la période." />
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
              <Stat label="Sélections" value={formatInteger(vp.count)} />
              <Stat label="Taux de réussite" value={formatPercent(vp.hitRate, 1)} />
              <Stat label="Précision 1X2" value={formatPercent(bt.model.accuracy, 1)} hint={bt.market ? `marché ${formatPercent(bt.market.accuracy, 1)}` : undefined} />
              <Stat label="Log-loss 1X2" value={formatNumber(bt.model.logLoss, 3)} hint={bt.market ? `marché ${formatNumber(bt.market.logLoss, 3)}` : undefined} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Calibration</CardTitle>
              <CardDescription>Les événements estimés à X % se produisent-ils ~X % du temps ?</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CalibrationChart data={bt.calibration} height={236} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="tabular mt-0.5 text-lg font-semibold">{value}</div>
      {hint && <div className="tabular text-[11px] text-subtle-foreground">{hint}</div>}
    </div>
  );
}

export function PerformanceSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card-surface h-[420px] rounded-xl p-5 lg:col-span-2">
        <div className="skeleton h-4 w-60 rounded" />
        <div className="skeleton mt-8 h-[260px] w-full rounded-lg" />
      </div>
      <div className="card-surface h-[420px] rounded-xl p-5">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton mt-8 h-[260px] w-full rounded-lg" />
      </div>
    </div>
  );
}

export async function UpcomingAndRecent() {
  const d = await getDashboardData();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Matchs à venir</CardTitle>
            <CardDescription>Les 3 prochains jours</CardDescription>
          </div>
        </CardHeader>
        <div className="mt-3 divide-y divide-border px-1 pb-1">
          {d.upcomingCards.length ? (
            d.upcomingCards.map((c) => <MatchRow key={c.match.id} card={c} tz={tz()} compact />)
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Aucun match programmé.</p>
          )}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Récemment terminés</CardTitle>
            <CardDescription>Dernières 48 heures</CardDescription>
          </div>
        </CardHeader>
        <div className="mt-3 divide-y divide-border px-1 pb-1">
          {d.recentCards.length ? (
            d.recentCards.map((c) => <MatchRow key={c.match.id} card={c} tz={tz()} compact />)
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Aucun match terminé récemment.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export async function TrendsSection() {
  const d = await getDashboardData();
  return (
    <section>
      <SectionTitle title="Tendances statistiques" description="Principales compétitions · matchs terminés sur 60 jours" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {d.trends.map((t) => (
          <Link key={t.competition.id} href={`/matches?competition=${encodeURIComponent(t.competition.id)}`} className="card-surface group rounded-xl p-4 transition-colors hover:border-border-strong">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{t.competition.country.flag}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.competition.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.competition.country.name} · {t.matches} matchs
                </p>
              </div>
              <ArrowRight className="ml-auto size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="tabular mt-4 text-[26px] leading-none font-semibold">
              {formatNumber(t.goalsPerMatch, 2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">buts/match</span>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <TrendBar label="Over 2.5" value={t.over25Rate} />
              <TrendBar label="BTTS" value={t.bttsRate} />
            </div>
            <div className="mt-3">
              <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full">
                <span className="bg-home" style={{ width: `${t.homeWinRate * 100}%` }} />
                <span className="bg-draw" style={{ width: `${t.drawRate * 100}%` }} />
                <span className="bg-away" style={{ width: `${t.awayWinRate * 100}%` }} />
              </div>
              <div className="tabular mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                <span>Dom. {formatPercent(t.homeWinRate)}</span>
                <span>Nul {formatPercent(t.drawRate)}</span>
                <span>Ext. {formatPercent(t.awayWinRate)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrendBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <span className="block h-full rounded-full bg-primary/80" style={{ width: `${value * 100}%` }} />
      </span>
      <span className="tabular w-9 text-right font-medium">{formatPercent(value)}</span>
    </div>
  );
}
