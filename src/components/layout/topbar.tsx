"use client";

import { Layers, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoBadge, LiveDot } from "@/components/common/badges";
import { LogoMark } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { useMounted } from "@/hooks/use-mounted";
import { useBetSlip } from "@/stores/bet-slip";
import { useApp } from "./app-context";
import { CommandSearch } from "./command-search";

function LiveIndicator() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { matches: unknown[] };
        if (!cancelled) setCount(data.matches.length);
      } catch {
        /* indicateur non critique */
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  if (!count) return null;
  return (
    <Link
      href="/matches?status=live"
      className="hidden h-8 items-center gap-2 rounded-lg border border-live/25 bg-live/10 px-2.5 text-xs font-medium text-live transition-colors hover:bg-live/15 sm:flex"
    >
      <LiveDot />
      <span className="tabular">{count}</span> en direct
    </Link>
  );
}

export function Topbar() {
  const { isDemo } = useApp();
  const count = useBetSlip((s) => s.selections.length);
  const mounted = useMounted();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link href="/" className="md:hidden" aria-label="Accueil">
          <LogoMark className="size-7" />
        </Link>
        <div className="min-w-0 flex-1">
          <CommandSearch />
        </div>
        <div className="flex items-center gap-2">
          <LiveIndicator />
          {isDemo && (
            <Hint label="Aucune API sportive configurée : toutes les données affichées sont fictives.">
              <span>
                <DemoBadge label="Données démo" className="h-7 px-2" />
              </span>
            </Hint>
          )}
          <Button asChild variant="secondary" size="sm" className="relative hidden md:inline-flex">
            <Link href="/combines">
              <Layers />
              Combiné
              {mounted && count > 0 && (
                <span className="tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
              )}
            </Link>
          </Button>
          <Hint label="Paramètres">
            <Button asChild variant="ghost" size="icon-sm" className="hidden md:inline-flex">
              <Link href="/settings" aria-label="Paramètres">
                <Settings />
              </Link>
            </Button>
          </Hint>
        </div>
      </div>
    </header>
  );
}
