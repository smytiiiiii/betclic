"use client";

import { AlertTriangle, Calculator, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { InfoTip } from "@/components/common/info-tip";
import { useApp } from "@/components/layout/app-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BankrollSettings } from "@/lib/domain/settings";
import { checkStake } from "@/lib/services/bankroll-math";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export function StakeSimulator({ balance, settings }: { balance: number; settings: BankrollSettings }) {
  const { currency } = useApp();
  const [bankroll, setBankroll] = useState(String(Math.max(0, Math.round(balance * 100) / 100)));
  const [stake, setStake] = useState("2");
  const [odds, setOdds] = useState("2.00");
  const [prob, setProb] = useState("");

  const b = num(bankroll);
  const s = num(stake);
  const o = num(odds);
  const p = prob.trim() ? num(prob) / 100 : NaN;
  const valid = b > 0 && s > 0;
  const check = valid ? checkStake(s, b, settings) : null;
  const pct = valid ? s / b : null;
  const ev = Number.isFinite(p) && o > 1 && s > 0 ? (p * o - 1) * s : null;
  const kelly = Number.isFinite(p) && o > 1 ? (p * o - 1) / (o - 1) : null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="size-4 text-primary" /> Simulateur de mise
          </CardTitle>
          <CardDescription>Visualisez la part de votre bankroll engagée</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="sim-bk">Bankroll ({currency})</Label>
            <Input id="sim-bk" inputMode="decimal" value={bankroll} onChange={(e) => setBankroll(e.target.value)} className="tabular" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sim-stake">Mise ({currency})</Label>
            <Input id="sim-stake" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} className="tabular" aria-invalid={!(s > 0)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sim-odds">Cote</Label>
            <Input id="sim-odds" inputMode="decimal" value={odds} onChange={(e) => setOdds(e.target.value)} className="tabular" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sim-prob" className="flex items-center gap-1">
              Probabilité estimée (%) <InfoTip>Optionnel : probabilité issue du modèle, pour calculer l&apos;espérance théorique.</InfoTip>
            </Label>
            <Input id="sim-prob" inputMode="decimal" value={prob} onChange={(e) => setProb(e.target.value)} placeholder="ex. 55" className="tabular" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2/50 p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Part de la bankroll utilisée</div>
              <div
                className={cn(
                  "tabular mt-1 text-4xl font-semibold",
                  check?.level === "high" ? "text-negative" : check?.level === "caution" ? "text-warning" : "text-foreground",
                )}
              >
                {formatPercent(pct, 1)}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Seuil d&apos;alerte
              <div className="tabular text-sm font-medium text-foreground">{settings.maxStakePct} %</div>
            </div>
          </div>
          <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn("h-full rounded-full transition-[width]", check?.level === "high" ? "bg-negative" : check?.level === "caution" ? "bg-warning" : "bg-primary")}
              style={{ width: `${Math.min(100, ((pct ?? 0) / Math.max(0.01, (settings.maxStakePct / 100) * 2)) * 100)}%` }}
            />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-foreground/40" title="Seuil" />
          </div>
          <div className="tabular mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div>
              <div className="text-subtle-foreground">Retour si gagné</div>
              <div className="font-medium">{s > 0 && o > 1 ? formatCurrency(s * o, currency) : "—"}</div>
            </div>
            <div>
              <div className="text-subtle-foreground">Perte si perdu</div>
              <div className="font-medium text-negative">{s > 0 ? formatCurrency(-s, currency) : "—"}</div>
            </div>
            <div>
              <div className="text-subtle-foreground">Espérance théorique</div>
              <div className="font-medium">{ev !== null ? formatCurrency(ev, currency, true) : "—"}</div>
            </div>
          </div>
          {kelly !== null && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Critère de Kelly (théorique) : {kelly > 0 ? formatPercent(kelly, 1) : "0 %"} de la bankroll. Il suppose une probabilité parfaitement connue, ce qui
              n&apos;est jamais le cas : ne l&apos;utilisez pas comme recommandation.
            </p>
          )}
        </div>

        {check && check.messages.length > 0 ? (
          <div className={cn("flex gap-2 rounded-lg border p-3 text-sm", check.level === "high" ? "border-negative/30 bg-negative/5 text-negative" : "border-warning/30 bg-warning/5 text-warning")} role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{check.messages.join(" ")}</span>
          </div>
        ) : valid ? (
          <div className="flex gap-2 rounded-lg border border-positive/25 bg-positive/5 p-3 text-sm text-positive">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>Mise inférieure à votre seuil d&apos;alerte.</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
