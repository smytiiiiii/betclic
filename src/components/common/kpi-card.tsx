import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  tip,
  badge,
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "primary";
  tip?: React.ReactNode;
  badge?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Card className={cn("group relative overflow-hidden p-4 transition-colors hover:border-border-strong md:p-5", className)}>
      <div className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100 md:opacity-60" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          {tip && <InfoTip>{tip}</InfoTip>}
        </div>
        {Icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div
        className={cn(
          "tabular mt-3 leading-none font-semibold tracking-tight",
          size === "md" ? "text-[28px] md:text-[32px]" : "text-2xl",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </div>
      {(sub || badge) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {badge}
          {sub}
        </div>
      )}
    </Card>
  );
}
