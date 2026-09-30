import { AlertTriangle, FlaskConical, Radio, ShieldCheck, ShieldHalf, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MatchStatus } from "@/lib/domain/types";
import { formatEdge } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DemoBadge({ className, label = "Démo" }: { className?: string; label?: string }) {
  return (
    <Badge variant="warning" className={className} title="Données fictives de démonstration">
      <FlaskConical /> {label}
    </Badge>
  );
}

const CONF = {
  high: { label: "Confiance élevée", short: "Élevée", icon: ShieldCheck, variant: "positive" as const },
  medium: { label: "Confiance moyenne", short: "Moyenne", icon: ShieldHalf, variant: "info" as const },
  low: { label: "Confiance faible", short: "Faible", icon: ShieldAlert, variant: "warning" as const },
};

export function ConfidenceBadge({ level, score, short = false, className }: { level: "low" | "medium" | "high"; score?: number; short?: boolean; className?: string }) {
  const c = CONF[level];
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className={className} title="Fiabilité statistique de l'estimation (et non probabilité de succès)">
      <Icon />
      {short ? c.short : c.label}
      {score !== undefined && <span className="tabular opacity-70">· {score}</span>}
    </Badge>
  );
}

export function EdgeBadge({ edge, className }: { edge: number | null; className?: string }) {
  if (edge === null) return <span className="text-xs text-subtle-foreground">—</span>;
  const variant = edge >= 0.03 ? "positive" : edge > 0 ? "primary" : edge > -0.03 ? "default" : "negative";
  return (
    <Badge variant={variant} className={cn("tabular", className)} title="Écart statistique = probabilité modèle − probabilité implicite de la cote">
      {formatEdge(edge)}
    </Badge>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2", className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-live" />
    </span>
  );
}

export function MatchStatusBadge({ status, minute, className }: { status: MatchStatus; minute: number | null; className?: string }) {
  switch (status) {
    case "LIVE":
      return (
        <Badge variant="live" className={cn("tabular", className)}>
          <LiveDot /> {minute ?? ""}&apos;
        </Badge>
      );
    case "HALFTIME":
      return (
        <Badge variant="live" className={className}>
          <Radio /> Mi-temps
        </Badge>
      );
    case "FINISHED":
      return <Badge className={className}>Terminé</Badge>;
    case "POSTPONED":
      return (
        <Badge variant="warning" className={className}>
          <AlertTriangle /> Reporté
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="negative" className={className}>
          Annulé
        </Badge>
      );
    default:
      return null;
  }
}
