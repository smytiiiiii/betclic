import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Rappel de jeu responsable, clairement visible. */
export function ResponsibleNotice({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <p className={cn("flex items-start gap-2 text-[11px] leading-relaxed text-subtle-foreground", className)}>
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Analyses statistiques uniquement : aucune prédiction n&apos;est certaine et les performances passées ne garantissent pas les résultats futurs. Les
          paris comportent un risque de perte financière. Réservé aux majeurs, respectez la loi applicable.{" "}
          <Link href="/responsible-gaming" className="underline underline-offset-2 hover:text-foreground">
            Jeu responsable
          </Link>
        </span>
      </p>
    );
  }
  return (
    <div className={cn("rounded-xl border border-warning/25 bg-warning/5 p-4", className)}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="font-medium">Information importante</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted-foreground">
            <li>Les analyses sont purement statistiques ; aucune prédiction n&apos;est certaine.</li>
            <li>Les performances passées ne garantissent pas les résultats futurs.</li>
            <li>Les paris comportent un risque de perte financière. Ne misez que ce que vous pouvez vous permettre de perdre.</li>
            <li>Respectez la législation applicable dans votre pays (jeux d&apos;argent interdits aux mineurs).</li>
          </ul>
          <Link href="/responsible-gaming" className="mt-2 inline-block text-xs font-medium text-warning underline-offset-2 hover:underline">
            En savoir plus sur le jeu responsable →
          </Link>
        </div>
      </div>
    </div>
  );
}
