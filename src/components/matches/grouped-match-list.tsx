import { FlaskConical } from "lucide-react";
import Link from "next/link";
import type { MatchCardDTO } from "@/lib/services/dto";
import { MatchRow } from "./match-row";

/** Liste de matchs groupée par compétition. */
export function GroupedMatchList({ cards, tz }: { cards: MatchCardDTO[]; tz: string }) {
  const groups = new Map<string, MatchCardDTO[]>();
  for (const c of cards) {
    const list = groups.get(c.match.competition.id) ?? [];
    list.push(c);
    groups.set(c.match.competition.id, list);
  }
  return (
    <div className="space-y-4">
      {[...groups.values()].map((list) => {
        const comp = list[0].match.competition;
        return (
          <section key={comp.id} className="card-surface overflow-hidden rounded-xl">
            <header className="flex items-center gap-2.5 border-b border-border bg-surface-2/50 px-4 py-2.5">
              <span className="text-base leading-none" aria-hidden>
                {comp.country.flag}
              </span>
              <Link href={`/matches?competition=${encodeURIComponent(comp.id)}`} className="text-sm font-semibold hover:underline">
                {comp.name}
              </Link>
              <span className="text-xs text-subtle-foreground">· {comp.country.name}</span>
              {comp.isDemo && (
                <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-warning">
                  <FlaskConical className="size-3" /> fictive
                </span>
              )}
              <span className="ml-auto text-xs text-subtle-foreground">{list.length} match{list.length > 1 ? "s" : ""}</span>
            </header>
            <div className="divide-y divide-border p-1">
              {list.map((c) => (
                <MatchRow key={c.match.id} card={c} tz={tz} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
