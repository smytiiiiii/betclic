import { CalendarDays, History, Layers, LayoutDashboard, Settings, ShieldCheck, Target, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Affiché dans la barre de navigation mobile. */
  mobile?: boolean;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard, mobile: true },
  { href: "/matches", label: "Matchs", icon: CalendarDays, mobile: true },
  { href: "/opportunities", label: "Opportunités", icon: Target, mobile: true },
  { href: "/combines", label: "Combinés", icon: Layers, mobile: true },
];

export const NAV_TOOLS: NavItem[] = [
  { href: "/bankroll", label: "Bankroll", icon: Wallet },
  { href: "/history", label: "Historique", icon: History },
];

export const NAV_FOOTER: NavItem[] = [
  { href: "/settings", label: "Paramètres", icon: Settings },
  { href: "/responsible-gaming", label: "Jeu responsable", icon: ShieldCheck },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
