import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { EdgeBadge, MatchStatusBadge } from "@/components/common/badges";
import { FormBadges } from "@/components/common/form-badges";
import { ProbabilityBar } from "@/components/common/probability-bar";
import { TeamCrest } from "@/components/common/team-crest";
import type { MatchCardDTO } from "@/lib/services/dto";
import { formatNumber, formatOdds, formatPercent, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function TeamLine({ card, side, showForm = true }: { card: MatchCardDTO; side: "home" | "away"; showForm?: boolean }) {
  const team = side === "home" ? card.match.homeTeam : card.match.awayTeam;
  const pos = side === "home" ? card.homePosition : card.awayPosition;
  const form = side === "home" ? card.homeForm : card.awayForm;
  const score = card.match.score?.[side];
  const other = card.match.score?.[side === "home" ? "away" : "home"];
  const winner = score !== undefined && other !== undefined && card.match.status === "FINISHED" && score > other;
  return (
    <div className="flex items-center gap-2.5">
      <TeamCrest team={team} size="sm" />
      <span className={cn("min-w-0 truncate text-sm", winner ? "font-semibold" : "font-medium")}>{team.name}</span>
      {pos !== null && <span className="tabular shrink-0 text-[11px] text-subtle-foreground">{pos}ᵉ</span>}
      {showForm && (
        <span className="ml-auto hidden shrink-0 lg:block">
          <FormBadges form={form} size="xs" />
        </span>
      )}
      {score !== undefined && score !== null && (
        <span className={cn("tabular w-5 shrink-0 text-right text-[15px] font-semibold", !winner && card.match.status === "FINISHED" && "text-muted-foreground")}>{score}</span>
      )}
    </div>
  );
}

/** Ligne de match riche (page Matchs, tableau de bord). */
export function MatchRow({ card, tz, compact = false, showOdds = true }: { card: MatchCardDTO; tz: string; compact?: boolean; showOdds?: boolean }) {
  const { match } = card;
  const live = match.status === "LIVE" || match.status === "HALFTIME";
  return (
    <Link
      href={`/matches/${encodeURIComponent(match.id)}`}
      className={cn(
        "group relative grid items-center gap-x-4 gap-y-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2 md:px-4",
        compact
          ? "grid-cols-[52px_1fr_auto]"
          : showOdds
            ? "grid-cols-[52px_1fr_auto] md:grid-cols-[60px_minmax(220px,1.4fr)_minmax(160px,1fr)_auto_auto]"
            : "grid-cols-[52px_1fr_auto] md:grid-cols-[60px_minmax(0,1.2fr)_minmax(150px,1fr)_auto]",
        live && "bg-live/[0.03]",
      )}
    >
      {live && <span className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-live" />}
      <div className="flex flex-col items-start gap-1">
        {match.status === "SCHEDULED" ? (
          <span className="tabular text-sm font-medium">{formatTime(match.kickoff, tz)}</span>
        ) : (
          <MatchStatusBadge status={match.status} minute={match.minute} />
        )}
        {match.status !== "SCHEDULED" && <span className="tabular text-[11px] text-subtle-foreground">{formatTime(match.kickoff, tz)}</span>}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <TeamLine card={card} side="home" showForm={showOdds} />
        <TeamLine card={card} side="away" showForm={showOdds} />
      </div>

      {!compact && (
        <div className="col-span-3 hidden md:col-span-1 md:block">
          {card.probabilities ? (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] tracking-wide text-subtle-foreground uppercase">
                <span>Probabilités modèle</span>
                {card.expectedGoals && (
                  <span className="tabular normal-case">
                    xG {formatNumber(card.expectedGoals.home, 2)} – {formatNumber(card.expectedGoals.away, 2)}
                  </span>
                )}
              </div>
              <ProbabilityBar home={card.probabilities.home} draw={card.probabilities.draw} away={card.probabilities.away} />
            </div>
          ) : (
            <span className="text-xs text-subtle-foreground">{match.status === "POSTPONED" ? "Match reporté" : "Données insuffisantes"}</span>
          )}
        </div>
      )}

      {!compact && showOdds && (
        <div className="hidden items-center gap-1 md:flex" aria-label="Cotes 1X2">
          {(["home", "draw", "away"] as const).map((k, i) => (
            <div key={k} className="flex w-14 flex-col items-center rounded-md border border-border bg-surface-2/60 py-1">
              <span className="text-[10px] text-subtle-foreground">{["1", "X", "2"][i]}</span>
              <span className="tabular text-[13px] font-semibold">{formatOdds(card.odds1x2?.[k] ?? null)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 justify-self-end">
        {card.bestEdge ? (
          <span className="hidden flex-col items-end gap-0.5 sm:flex">
            <EdgeBadge edge={card.bestEdge.edge} />
            <span className="max-w-28 truncate text-[10px] text-subtle-foreground">{card.bestEdge.label}</span>
          </span>
        ) : card.probabilities && compact ? (
          <span className="tabular hidden text-xs text-muted-foreground sm:block">O2.5 {formatPercent(card.probabilities.over25)}</span>
        ) : null}
        <ChevronRight className="size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      {!compact && card.probabilities && (
        <div className="col-span-3 md:hidden">
          <ProbabilityBar home={card.probabilities.home} draw={card.probabilities.draw} away={card.probabilities.away} />
        </div>
      )}
    </Link>
  );
}

export function MatchRowSkeleton() {
  return (
    <div className="grid grid-cols-[52px_1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[60px_minmax(220px,1.4fr)_minmax(160px,1fr)_auto_auto]">
      <div className="skeleton h-4 w-10 rounded" />
      <div className="space-y-2">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
      <div className="skeleton hidden h-2 w-full rounded md:block" />
      <div className="hidden gap-1 md:flex">
        <div className="skeleton h-9 w-14 rounded" />
        <div className="skeleton h-9 w-14 rounded" />
        <div className="skeleton h-9 w-14 rounded" />
      </div>
      <div className="skeleton h-4 w-4 rounded" />
    </div>
  );
}
