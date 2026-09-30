"use client";

import { cn } from "@/lib/utils";

export const AXIS_TICK = { fill: "var(--subtle-foreground)", fontSize: 11 };
export const GRID_STROKE = "var(--grid)";

export function ChartTooltipBox({ title, rows, className }: { title?: React.ReactNode; rows: { label: React.ReactNode; value: React.ReactNode; color?: string }[]; className?: string }) {
  return (
    <div className={cn("min-w-36 rounded-lg border border-border-strong bg-surface-3/95 px-3 py-2 text-xs shadow-xl backdrop-blur", className)}>
      {title && <div className="mb-1.5 font-medium text-foreground">{title}</div>}
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className="tabular font-medium text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string; dashed?: boolean }[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground", className)}>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 3px, transparent 3px 5px)` : i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
