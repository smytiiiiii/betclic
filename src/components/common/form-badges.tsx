import type { MatchResult } from "@/lib/domain/types";
import { RESULT_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const STYLES: Record<MatchResult, string> = {
  W: "bg-positive/15 text-positive border-positive/30",
  D: "bg-draw/15 text-muted-foreground border-draw/30",
  L: "bg-negative/15 text-negative border-negative/30",
};

const TITLES: Record<MatchResult, string> = { W: "Victoire", D: "Match nul", L: "Défaite" };

/** Forme récente (du plus récent au plus ancien, affichée de gauche à droite : ancien → récent). */
export function FormBadges({ form, size = "sm", className }: { form: MatchResult[]; size?: "xs" | "sm"; className?: string }) {
  if (!form.length) return <span className="text-xs text-subtle-foreground">—</span>;
  const ordered = [...form].reverse();
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Forme : ${ordered.map((r) => TITLES[r]).join(", ")}`}>
      {ordered.map((r, i) => (
        <span
          key={i}
          title={TITLES[r]}
          className={cn(
            "inline-flex items-center justify-center rounded-[4px] border font-semibold",
            size === "xs" ? "size-4 text-[9px]" : "size-5 text-[10px]",
            STYLES[r],
            i === ordered.length - 1 && "ring-1 ring-foreground/20",
          )}
        >
          {RESULT_LABEL[r]}
        </span>
      ))}
    </span>
  );
}
