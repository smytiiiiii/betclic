"use client";

import { CalendarDays, Loader2, Search, Shield, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Result {
  type: "match" | "team" | "competition";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const ICONS = { match: CalendarDays, team: Shield, competition: Trophy };
const TYPE_LABEL = { match: "Match", team: "Équipe", competition: "Compétition" };

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Recherche indisponible pour le moment.");
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const go = useCallback(
    (r: Result) => {
      setOpen(false);
      setQuery("");
      setResults([]);
      router.push(r.href);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  const showResults = query.trim().length >= 2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-border bg-surface-2/70 px-3 text-sm text-subtle-foreground transition-colors hover:border-border-strong hover:text-muted-foreground"
        aria-label="Rechercher un match, une équipe ou une compétition"
      >
        <Search className="size-4" />
        <span className="truncate">Rechercher un match, une équipe…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-subtle-foreground sm:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0" hideClose>
          <DialogTitle className="sr-only">Recherche rapide</DialogTitle>
          <DialogDescription className="sr-only">Rechercher un match, une équipe ou une compétition</DialogDescription>
          <div className="flex items-center gap-3 border-b border-border px-4">
            {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Search className="size-4 text-muted-foreground" />}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Équipe, compétition, match…"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle-foreground"
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `sr-${results[active].id}` : undefined}
            />
            <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-subtle-foreground">Échap</kbd>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {!showResults && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Tapez au moins 2 caractères.</p>}
            {showResults && error && <p className="px-3 py-8 text-center text-sm text-negative">{error}</p>}
            {showResults && !error && !loading && results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
            )}
            {showResults && results.length > 0 && (
              <ul id="search-results" ref={listRef} role="listbox">
                {results.map((r, i) => {
                  const Icon = ICONS[r.type];
                  return (
                    <li key={`${r.type}-${r.id}`} id={`sr-${r.id}`} role="option" aria-selected={i === active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r)}
                        className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", i === active ? "bg-surface-3" : "hover:bg-surface-2")}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                        </span>
                        <span className="text-[10px] tracking-wide text-subtle-foreground uppercase">{TYPE_LABEL[r.type]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
