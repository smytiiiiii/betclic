import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BankrollSettings } from "@/lib/domain/settings";
import type { LimitStatus } from "@/lib/services/bankroll-math";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function LimitRow({ label, status, currency }: { label: string; status: LimitStatus; currency: string }) {
  if (!status.enabled) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-xs text-subtle-foreground">Non définie</span>
      </div>
    );
  }
  const ratio = Math.min(1, status.loss / status.limit);
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className={cn("tabular text-xs", status.exceeded ? "font-semibold text-negative" : "text-muted-foreground")}>
          {formatCurrency(status.loss, currency)} / {formatCurrency(status.limit, currency)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full", ratio >= 1 ? "bg-negative" : ratio > 0.75 ? "bg-warning" : "bg-primary")} style={{ width: `${ratio * 100}%` }} />
      </div>
      {status.exceeded && <p className="mt-1.5 text-xs text-negative">Limite atteinte : nous vous recommandons de faire une pause.</p>}
    </div>
  );
}

export function LimitsCard({ daily, weekly, settings, currency }: { daily: LimitStatus; weekly: LimitStatus; settings: BankrollSettings; currency: string }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Limites de jeu responsable
          </CardTitle>
          <CardDescription>
            Alerte au-delà de {settings.maxStakePct} % de bankroll par mise · limites {settings.hardLimits ? "strictes (blocage)" : "indicatives"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <LimitRow label="Perte journalière" status={daily} currency={currency} />
        <LimitRow label="Perte sur 7 jours" status={weekly} currency={currency} />
        <Button asChild variant="link" size="sm">
          <Link href="/settings#bankroll">Modifier mes limites</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
