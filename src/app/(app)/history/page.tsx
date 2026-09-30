import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { connection } from "next/server";
import { BetsTable } from "@/components/bankroll/bets-table";
import { DemoBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { ModelHistory } from "@/components/history/model-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env } from "@/lib/config/env";
import { getBacktest } from "@/lib/services/backtest";
import { getBankrollState } from "@/lib/services/bankroll";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoryPage() {
  await connection();
  const [bt, { bets }] = await Promise.all([getBacktest(), getBankrollState()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={bt.isDemo ? <DemoBadge label="Backtest sur données fictives" /> : undefined}
        title="Historique"
        description={`Historique des analyses du modèle (backtest ${env().BACKTEST_DAYS} jours, mise fixe d'1 unité par sélection avec écart ≥ ${bt.settingsMinEdge} pts) et de vos paris enregistrés.`}
      />
      {bt.isDemo && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Ces résultats portent sur des matchs et des cotes fictifs générés pour la démonstration. Ils ne représentent aucune performance réelle.
        </div>
      )}
      <Tabs defaultValue="model">
        <TabsList>
          <TabsTrigger value="model">Analyses du modèle ({bt.records.length})</TabsTrigger>
          <TabsTrigger value="bets">Mes paris ({bets.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="model">
          <ModelHistory records={bt.records} />
        </TabsContent>
        <TabsContent value="bets">
          <BetsTable bets={bets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
