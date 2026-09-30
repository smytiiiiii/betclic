import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { ResponsibleNotice } from "@/components/common/responsible-notice";
import {
  AlertsCard,
  KpiRow,
  KpiRowSkeleton,
  ListSkeleton,
  PerformanceSection,
  PerformanceSkeleton,
  TodayMatches,
  TopOpportunities,
  TrendsSection,
  UpcomingAndRecent,
} from "@/components/dashboard/sections";
import { env } from "@/lib/config/env";
import { getProvider } from "@/lib/providers";

export default async function DashboardPage() {
  await connection();
  const isDemo = getProvider().info.isDemo;
  const label = new Intl.DateTimeFormat("fr-FR", { timeZone: env().APP_TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <>
            <span className="capitalize">{label}</span>
            <span>·</span>
            <span>{env().APP_TIMEZONE}</span>
            {isDemo && <DemoBadge label="Données de démonstration" />}
          </>
        }
        title="Tableau de bord"
        description="Vue d'ensemble des matchs, des probabilités estimées par le moteur statistique et de ses performances historiques."
      />

      <Suspense fallback={<KpiRowSkeleton />}>
        <KpiRow />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<ListSkeleton title="Matchs du jour" rows={7} />}>
            <TodayMatches />
          </Suspense>
        </div>
        <div className="space-y-4">
          <Suspense fallback={<div className="card-surface skeleton h-64 rounded-xl" />}>
            <AlertsCard />
          </Suspense>
          <Suspense fallback={<div className="card-surface skeleton h-80 rounded-xl" />}>
            <TopOpportunities />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<PerformanceSkeleton />}>
        <PerformanceSection />
      </Suspense>

      <Suspense fallback={<div className="grid gap-4 lg:grid-cols-2"><ListSkeleton rows={5} /><ListSkeleton rows={5} /></div>}>
        <UpcomingAndRecent />
      </Suspense>

      <Suspense fallback={<div className="card-surface skeleton h-60 rounded-xl" />}>
        <TrendsSection />
      </Suspense>

      <ResponsibleNotice />
    </div>
  );
}
