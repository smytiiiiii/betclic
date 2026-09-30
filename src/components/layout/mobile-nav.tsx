"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/common/logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/stores/bet-slip";
import { NAV_FOOTER, NAV_MAIN, NAV_TOOLS, isActive } from "./nav-items";

/** Barre d'onglets fixe en bas d'écran (mobile). */
export function MobileTabBar() {
  const pathname = usePathname();
  const count = useBetSlip((s) => s.selections.length);
  const mounted = useMounted();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Navigation mobile"
    >
      <ul className="grid grid-cols-5">
        {NAV_MAIN.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}
              >
                <Icon className="size-5" />
                {item.label === "Tableau de bord" ? "Accueil" : item.label}
                {item.href === "/combines" && mounted && count > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-18px)] flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <MobileMoreMenu />
        </li>
      </ul>
    </nav>
  );
}

function MobileMoreMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex h-14 w-full flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground">
        <Menu className="size-5" />
        Plus
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="p-5">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Accès aux autres sections</SheetDescription>
          <Logo />
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[...NAV_TOOLS, ...NAV_FOOTER].map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium",
                    active ? "border-primary/40 bg-primary-soft text-foreground" : "border-border bg-surface-2 text-muted-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-primary")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
