"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/common/logo";
import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";
import { NAV_FOOTER, NAV_MAIN, NAV_TOOLS, isActive, type NavItem } from "./nav-items";

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors md:justify-center lg:justify-start",
        active ? "text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg border border-border-strong bg-surface-2"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-primary" />}
      <Icon className={cn("relative size-[18px] shrink-0", active && "text-primary")} />
      <span className="relative md:hidden lg:inline">{item.label}</span>
    </Link>
  );
  return (
    <>
      <span className="hidden md:block lg:hidden">
        <Hint label={item.label} side="right">
          {link}
        </Hint>
      </span>
      <span className="md:hidden lg:block">{link}</span>
    </>
  );
}

function Group({ label, items, pathname, onNavigate }: { label: string; items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="mb-1 px-2.5 text-[10px] font-medium tracking-[0.12em] text-subtle-foreground uppercase md:hidden lg:block">{label}</p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

/** Contenu de navigation (réutilisé dans le menu mobile). */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { isDemo, providerName } = useApp();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4 md:justify-center md:px-0 lg:justify-start lg:px-4">
        <Link href="/" onClick={onNavigate} aria-label="Kairos — accueil">
          <span className="md:hidden lg:inline">
            <Logo />
          </span>
          <span className="hidden md:inline lg:hidden">
            <Logo compact />
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
        <Group label="Analyse" items={NAV_MAIN} pathname={pathname} onNavigate={onNavigate} />
        <Group label="Suivi" items={NAV_TOOLS} pathname={pathname} onNavigate={onNavigate} />
        <div className="mt-auto">
          <Group label="Compte" items={NAV_FOOTER} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </nav>
      <div className="border-t border-border p-3 md:hidden lg:block">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className={cn("size-1.5 rounded-full", isDemo ? "bg-warning" : "bg-positive")} />
            {isDemo ? "Mode démonstration" : "Données en direct"}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-subtle-foreground">
            {isDemo ? "Données fictives. Configurez une API sportive dans .env.local." : `Source : ${providerName}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface/80 backdrop-blur-xl md:block md:w-[72px] lg:w-60">
      <SidebarNav />
    </aside>
  );
}
