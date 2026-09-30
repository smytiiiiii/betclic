import { cn } from "@/lib/utils";

/** Monogramme Kairos : trajectoire de balle dans un cadre arrondi. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--primary)" />
      <path d="M1 16 V10 A9 9 0 0 1 10 1 H22 A9 9 0 0 1 31 10 V16 Z" fill="#fff" opacity="0.08" />
      <path d="M9 23 L9 9" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9.5 16.5 Q15 16 20 9.5" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M13 17 L19.5 23" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="23.5" cy="8.5" r="2.4" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight">Kairos</span>
          <span className="mt-0.5 text-[10px] font-medium tracking-[0.14em] text-subtle-foreground uppercase">Football Analytics</span>
        </span>
      )}
    </span>
  );
}
