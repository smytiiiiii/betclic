import type { Metadata } from "next";
import { Coins, Percent, PiggyBank, Scale, Target, Timer, Wallet } from "lucide-react";
import { connection } from "next/server";
import { BankrollChart } from "@/components/charts/bankroll-chart";
import { BetFormDialog } from "@/components/bankroll/bet-form-dialog";
import { BetsTable } from "@/components/bankroll/bets-table";
import { LimitsCard } from "@/components/bankroll/limits-card";
import { ResetBankroll } from "@/components/bankroll/reset-bankroll";
import { StakeSimulator } from "@/components/bankroll/stake-simulator";
import { TransactionsCard } from "@/components/bankroll/transactions-card";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { ResponsibleNotice } from "@/components/common/responsible-notice";
import { EmptyState } from "@/components/common/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/config/env";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getBankrollState } from "@/lib/services/bankroll";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Bankroll" };

export default async function BankrollPage() {
  await connection();
  const [{ bets, transactions, summary }, settings] = await Promise.all([getBankrollState(), getSettings()]);
  const cur = settings.currency;
  const profitTone = summary.settledProfit > 0 ? "positive" : summary.settledProfit < 0 ? "negative" : "default";
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bankroll"
        description="Suivez votre capital, vos mises et vos résultats. Fixez des limites et soyez alerté en cas de mise excessive."
        actions={
          <>
            <ResetBankroll />
            <BetFormDialog summary={summary} settings={settings.bankroll} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard size="sm" label="Solde actuel" value={formatCurrency(summary.balance, cur)} icon={Wallet} sub={summary.pendingStake > 0 ? `${formatCurrency(summary.pendingStake, cur)} en jeu` : "aucune mise en cours"} />
        <KpiCard size="sm" label="Bankroll initiale" value={formatCurrency(summary.initial, cur)} icon={PiggyBank} sub={`+${formatCurrency(summary.deposits, cur)} / −${formatCurrency(summary.withdrawals, cur)}`} />
        <KpiCard size="sm" label="Gains / pertes" value={formatCurrency(summary.settledProfit, cur, true)} tone={profitTone} icon={Coins} sub="paris réglés" />
        <KpiCard size="sm" label="ROI" value={formatPercent(summary.roi, 1)} icon={Percent} tone={profitTone} sub={`${formatCurrency(summary.totalStaked, cur)} misés`} tip="Retour sur investissement = gains nets / total misé (paris gagnés ou perdus)." />
        <KpiCard size="sm" label="Taux de réussite" value={formatPercent(summary.winRate, 1)} icon={Target} sub={`${summary.counts.won} G · ${summary.counts.lost} P · ${summary.counts.void} R`} />
        <KpiCard
          size="sm"
          label="Mises en cours"
          value={String(summary.counts.pending)}
          icon={Timer}
          sub={summary.streak.type ? `Série : ${summary.streak.length} ${summary.streak.type === "won" ? "gagné(s)" : "perdu(s)"}` : "—"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Évolution du solde</CardTitle>
              <CardDescription>Ligne pointillée : bankroll initiale · profit cumulé {formatCurrency(summary.settledProfit, cur, true)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {summary.series.length > 1 ? (
              <BankrollChart data={summary.series} initial={summary.initial} currency={cur} timezone={env().APP_TIMEZONE} />
            ) : (
              <EmptyState icon={Scale} title="Pas encore d'historique" description="Le graphique apparaîtra après vos premiers paris réglés ou mouvements." />
            )}
          </CardContent>
        </Card>
        <StakeSimulator balance={summary.balance} settings={settings.bankroll} />
      </div>

      <BetsTable bets={bets} />

      <div className="grid gap-4 lg:grid-cols-2">
        <LimitsCard daily={summary.daily} weekly={summary.weekly} settings={settings.bankroll} currency={cur} />
        <TransactionsCard transactions={transactions} />
      </div>

      <ResponsibleNotice />
    </div>
  );
}
