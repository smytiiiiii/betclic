import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { GroupedMatchList } from "@/components/matches/grouped-match-list";
import { MatchFilters } from "@/components/matches/match-filters";
import { MatchRowSkeleton } from "@/components/matches/match-row";
import { env } from "@/lib/config/env";
import { formatDayKey } from "@/lib/format";
import { getProvider } from "@/lib/providers";
import { getFilterOptions, listMatchCards, parseMatchFilters, todayKey, type MatchFilters as Filters } from "@/lib/services/matches";

export const metadata: Metadata = { title: "Matchs" };

async function MatchList({ filters }: { filters: Filters }) {
  const { cards, total, day, range } = await listMatchCards(filters);
  if (cards.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title={total === 0 ? "Aucun match programmé" : "Aucun match ne correspond à vos filtres"}
        description={total === 0 ? "Essayez un autre jour." : `${total} match(s) ce jour-là. Modifiez ou réinitialisez les filtres.`}
      />
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {cards.length} match{cards.length > 1 ? "s" : ""}
        {range ? ` du ${formatDayKey(range.from, todayKey())} au ${formatDayKey(range.to, todayKey())}` : day ? ` · ${formatDayKey(day, todayKey())}` : ""}
        {cards.length !== total && ` (sur ${total})`}
      </p>
      <GroupedMatchList cards={cards} tz={env().APP_TIMEZONE} />
    </div>
  );
}

function ListFallback() {
  return (
    <div className="card-surface overflow-hidden rounded-xl">
      <div className="border-b border-border bg-surface-2/50 px-4 py-3">
        <div className="skeleton h-4 w-40 rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }, (_, i) => (
          <MatchRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default async function MatchesPage({ searchParams }: PageProps<"/matches">) {
  await connection();
  const filters = parseMatchFilters(await searchParams);
  const [options] = await Promise.all([getFilterOptions()]);
  const today = todayKey();
  const key = JSON.stringify(filters);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={getProvider().info.isDemo ? <DemoBadge label="Compétitions et équipes fictives" /> : undefined}
        title="Matchs"
        description="Parcourez les matchs, filtrez par date, compétition, pays, équipe, statut ou heure, et ouvrez l'analyse détaillée."
      />
      <MatchFilters options={options} today={today} day={filters.date ?? (filters.team ? null : today)} />
      <Suspense key={key} fallback={<ListFallback />}>
        <MatchList filters={filters} />
      </Suspense>
    </div>
  );
}
