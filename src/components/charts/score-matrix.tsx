"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Carte de chaleur des scores exacts (séquentielle, une teinte). */
export function ScoreMatrix({ matrix, homeName, awayName, size = 6 }: { matrix: number[][]; homeName: string; awayName: string; size?: number }) {
  const rows = matrix.slice(0, size).map((r) => r.slice(0, size));
  const max = Math.max(...rows.flat());
  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `auto repeat(${size}, minmax(40px, 88px))` }}>
        <div className="flex items-end justify-end p-1 text-[10px] leading-tight text-subtle-foreground">
          <span>
            <span className="text-home">{homeName}</span> ↓<br />
            <span className="text-away">{awayName}</span> →
          </span>
        </div>
        {Array.from({ length: size }, (_, a) => (
          <div key={`h${a}`} className="tabular py-1 text-center text-[11px] font-medium text-muted-foreground">
            {a}
          </div>
        ))}
        {rows.map((row, h) => (
          <div key={`r${h}`} className="contents">
            <div className="tabular flex items-center justify-end pr-2 text-[11px] font-medium text-muted-foreground">{h}</div>
            {row.map((p, a) => {
              const intensity = max > 0 ? p / max : 0;
              return (
                <Tooltip key={`${h}-${a}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn("tabular flex h-9 items-center justify-center rounded-[4px] text-[11px] transition-transform hover:scale-105", intensity > 0.55 ? "text-white" : "text-muted-foreground")}
                      style={{ background: `color-mix(in oklab, var(--home) ${Math.round(8 + intensity * 82)}%, var(--surface-2))` }}
                    >
                      {p >= 0.005 ? formatPercent(p) : "·"}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Score {h}-{a} : probabilité estimée {formatPercent(p, 1)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
