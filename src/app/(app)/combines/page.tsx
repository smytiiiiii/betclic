import type { Metadata } from "next";
import { connection } from "next/server";
import { AccumulatorBuilder } from "@/components/accumulator/accumulator-builder";
import { PageHeader } from "@/components/common/page-header";
import { ResponsibleNotice } from "@/components/common/responsible-notice";
import { getBankrollState } from "@/lib/services/bankroll";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Combinés" };

export default async function CombinesPage() {
  await connection();
  const [{ summary }, settings] = await Promise.all([getBankrollState(), getSettings()]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Combinés"
        description="Assemblez plusieurs sélections et obtenez une estimation de la probabilité combinée. Les corrélations entre marchés d'un même match sont prises en compte ; l'indépendance est supposée entre matchs différents."
      />
      <AccumulatorBuilder balance={summary.balance} bankroll={settings.bankroll} />
      <ResponsibleNotice />
    </div>
  );
}
