import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Barre 1X2 : domicile / nul / extérieur (couleurs d'identité + libellés, jamais la couleur seule). */
export function ProbabilityBar({
  home,
  draw,
  away,
  showLabels = true,
  className,
}: {
  home: number;
  draw: number;
  away: number;
  showLabels?: boolean;
  className?: string;
}) {
  const segs = [
    { key: "1", v: home, cls: "bg-home", label: "1" },
    { key: "X", v: draw, cls: "bg-draw", label: "X" },
    { key: "2", v: away, cls: "bg-away", label: "2" },
  ];
  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Probabilités estimées : domicile ${formatPercent(home)}, nul ${formatPercent(draw)}, extérieur ${formatPercent(away)}`}>
        {segs.map((s) => (
          <span key={s.key} className={cn("h-full first:rounded-l-full last:rounded-r-full", s.cls)} style={{ width: `${Math.max(2, s.v * 100)}%` }} />
        ))}
      </div>
      {showLabels && (
        <div className="tabular mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          {segs.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className={cn("size-1.5 rounded-full", s.cls)} />
              <span className="text-subtle-foreground">{s.label}</span>
              <span className="font-medium text-foreground">{formatPercent(s.v)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Jauge horizontale simple 0-100 %. */
export function Meter({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "home" | "away" | "warning" }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "primary" && "bg-primary",
          tone === "home" && "bg-home",
          tone === "away" && "bg-away",
          tone === "warning" && "bg-warning",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}
