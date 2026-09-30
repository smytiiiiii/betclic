import type { TeamRef } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const SIZES = { xs: "size-5 text-[7px]", sm: "size-7 text-[9px]", md: "size-9 text-[10px]", lg: "size-14 text-sm", xl: "size-20 text-lg" } as const;

/**
 * Écusson d'équipe : logo de la source si disponible, sinon écusson généré
 * à partir des couleurs et du code de l'équipe (aucun logo réel n'est imité).
 */
export function TeamCrest({ team, size = "md", className }: { team: Pick<TeamRef, "code" | "name" | "logo" | "colors">; size?: keyof typeof SIZES; className?: string }) {
  if (team.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logos distants de la source de données
      <img src={team.logo} alt="" className={cn(SIZES[size], "shrink-0 object-contain")} loading="lazy" />
    );
  }
  return (
    <span className={cn(SIZES[size], "relative inline-flex shrink-0 items-center justify-center", className)} aria-hidden title={team.name}>
      <svg viewBox="0 0 40 44" className="absolute inset-0 size-full drop-shadow-sm">
        <path d="M20 1.5 L37 7 V21 C37 31 29.5 38.5 20 42.5 C10.5 38.5 3 31 3 21 V7 Z" fill={team.colors.primary} />
        <path d="M20 1.5 L37 7 V21 C37 31 29.5 38.5 20 42.5 Z" fill="#000" opacity="0.14" />
        <path d="M9 6.5 L20 3.2 L31 6.5" stroke={team.colors.secondary} strokeWidth="1.6" fill="none" opacity="0.8" />
        <path d="M20 1.5 L37 7 V21 C37 31 29.5 38.5 20 42.5 C10.5 38.5 3 31 3 21 V7 Z" fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1.2" />
      </svg>
      <span className="relative mt-[6%] font-extrabold tracking-tight" style={{ color: team.colors.secondary }}>
        {team.code}
      </span>
    </span>
  );
}
