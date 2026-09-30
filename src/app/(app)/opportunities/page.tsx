import type { Metadata } from "next";
import { AlertTriangle, Calculator } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { DemoBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { ResponsibleNotice } from "@/components/common/responsible-notice";
import { OpportunitiesTable } from "@/components/opportunities/opportunities-table";
import { cn } from "@/lib/utils";
import { getProvider } from "@/lib/providers";
import { getOpportunities } from "@/lib/services/opportunities";

export const metadata: Metadata = { title: "Opportunités" };

const DAYS = [1, 3, 7];

export default async function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  await connection();
  const sp = await searchParams;
  const raw = Number(Array.isArray(sp.days) ? sp.days[0] : sp.days);
  const days = DAYS.includes(raw) ? raw : 3;
  // On récupère tous les écarts positifs puis on filtre côté client.
  const data = await getOpportunities({ days, minEdge: 0.5, minConfidence: 0 });
  const { minEdge } = await getOpportunities({ days });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={getProvider().info.isDemo ? <DemoBadge label="Cotes et matchs fictifs" /> : undefined}
        title="Opportunités statistiques"
        description="Marchés présentant les plus grands écarts entre la probabilité estimée par le modèle et la probabilité implicite de la cote."
        actions={
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            {DAYS.map((d) => (
              <Link
                key={d}
                href={`/opportunities?days=${d}`}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", d === days ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {d === 1 ? "24 h" : `${d} jours`}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card-surface flex gap-3 rounded-xl p-4 text-sm">
          <Calculator className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Comment lire un écart ?</p>
            <p className="mt-1 text-muted-foreground">
              Probabilité implicite = 1 / cote. Si la cote vaut 2,00 (50 %) et que le modèle estime 60 %, l&apos;écart statistique est de +10 points.
              {` ${data.analyzedMatches} matchs analysés sur la période.`}
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Pas une garantie de profit</p>
            <p className="mt-1 text-muted-foreground">
              Un écart positif signifie seulement que le modèle et le marché divergent. Le marché peut intégrer des informations absentes du modèle. Les gros
              écarts sont souvent un signal de prudence.
            </p>
          </div>
        </div>
      </div>
      <OpportunitiesTable items={data.items} minEdge={minEdge} />
      <ResponsibleNotice compact />
    </div>
  );
}
