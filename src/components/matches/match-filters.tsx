"use client";

import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatDayKey } from "@/lib/format";
import { addDays } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface FilterOptionsProps {
  competitions: { id: string; name: string; country: { code: string; name: string; flag: string } }[];
  countries: { code: string; name: string; flag: string }[];
  teams: { id: string; name: string }[];
}

const ALL = "__all";
const STATUS = [
  { value: "all", label: "Tous" },
  { value: "upcoming", label: "À venir" },
  { value: "live", label: "En direct" },
  { value: "finished", label: "Terminés" },
] as const;

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function MatchFilters({ options, today, day }: { options: FilterOptionsProps; today: string; day: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === ALL) next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Recherche rapide avec anti-rebond.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const currentDay = day ?? today;
  const days = Array.from({ length: 9 }, (_, i) => addDays(today, i - 3));
  const status = params.get("status") ?? "all";
  const activeCount = ["competition", "country", "team", "from", "to"].filter((k) => params.get(k)).length;

  const advanced = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <FilterSelect
        label="Compétition"
        value={params.get("competition") ?? ALL}
        onChange={(v) => update({ competition: v })}
        items={[{ value: ALL, label: "Toutes" }, ...options.competitions.map((c) => ({ value: c.id, label: `${c.country.flag} ${c.name}` }))]}
      />
      <FilterSelect
        label="Pays"
        value={params.get("country") ?? ALL}
        onChange={(v) => update({ country: v })}
        items={[{ value: ALL, label: "Tous" }, ...options.countries.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))]}
      />
      <FilterSelect
        label="Équipe"
        value={params.get("team") ?? ALL}
        onChange={(v) => update({ team: v })}
        items={[{ value: ALL, label: "Toutes" }, ...options.teams.map((t) => ({ value: t.id, label: t.name }))]}
      />
      <FilterSelect
        label="Heure min."
        value={params.get("from") ?? ALL}
        onChange={(v) => update({ from: v })}
        items={[{ value: ALL, label: "—" }, ...HOURS.map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }))]}
      />
      <FilterSelect
        label="Heure max."
        value={params.get("to") ?? ALL}
        onChange={(v) => update({ to: v })}
        items={[{ value: ALL, label: "—" }, ...HOURS.map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:59` }))]}
      />
    </div>
  );

  return (
    <div className={cn("space-y-3 transition-opacity", pending && "opacity-70")}>
      {/* Sélecteur de date */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon-sm" aria-label="Jour précédent" onClick={() => update({ date: addDays(currentDay, -1) })}>
          <ChevronLeft />
        </Button>
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          {days.map((d) => {
            const active = d === day || (!day && !params.get("team") && d === today);
            const [, , dd] = d.split("-");
            const label = formatDayKey(d, today);
            const short = label === "Aujourd'hui" || label === "Demain" || label === "Hier" ? label : label.split(" ")[0].slice(0, 3) + ".";
            return (
              <button
                key={d}
                type="button"
                onClick={() => update({ date: d === today ? null : d })}
                className={cn(
                  "flex h-12 min-w-16 shrink-0 flex-col items-center justify-center rounded-lg border px-3 text-xs transition-colors",
                  active ? "border-primary/50 bg-primary-soft text-foreground" : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
                aria-pressed={active}
              >
                <span className="font-medium capitalize">{short}</span>
                <span className={cn("tabular text-[15px] font-semibold", active && "text-primary")}>{Number(dd)}</span>
              </button>
            );
          })}
        </div>
        <Button variant="secondary" size="icon-sm" aria-label="Jour suivant" onClick={() => update({ date: addDays(currentDay, 1) })}>
          <ChevronRight />
        </Button>
        <label className="relative hidden sm:block">
          <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="date" value={currentDay} onChange={(e) => e.target.value && update({ date: e.target.value })} className="h-8 w-40 pl-8 text-xs" aria-label="Choisir une date" />
        </label>
      </div>

      {/* Recherche + statut + filtres */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recherche rapide : équipe, compétition…" className="pl-9" aria-label="Recherche rapide" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface p-0.5" role="radiogroup" aria-label="Statut">
            {STATUS.map((s) => (
              <button
                key={s.value}
                role="radio"
                aria-checked={status === s.value}
                onClick={() => update({ status: s.value === "all" ? null : s.value })}
                className={cn("h-8 rounded-md px-2.5 text-xs font-medium transition-colors", status === s.value ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="lg:hidden">
                <SlidersHorizontal /> Filtres {activeCount > 0 && <span className="tabular text-primary">({activeCount})</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <div className="p-5">
                <SheetTitle>Filtres</SheetTitle>
                <SheetDescription className="mb-4">Affinez la liste des matchs.</SheetDescription>
                {advanced}
              </div>
            </SheetContent>
          </Sheet>
          {(activeCount > 0 || q || status !== "all" || day) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                startTransition(() => router.replace(pathname, { scroll: false }));
              }}
            >
              <RotateCcw /> Réinitialiser
            </Button>
          )}
        </div>
      </div>
      <div className="hidden lg:block">{advanced}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-medium text-subtle-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
