"use client";

import { CalendarDays, Clock, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { DemoBadge, LiveDot, MatchStatusBadge } from "@/components/common/badges";
import { FormBadges } from "@/components/common/form-badges";
import { TeamCrest } from "@/components/common/team-crest";
import { useApp } from "@/components/layout/app-context";
import type { MatchResult, Match } from "@/lib/domain/types";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLive } from "./live-context";

interface Props {
  match: Match;
  homeForm: MatchResult[];
  awayForm: MatchResult[];
  homePosition: number | null;
  awayPosition: number | null;
  expectedGoals: { home: number; away: number } | null;
}

function HeroTeam({ side, match, form, position }: { side: "home" | "away"; match: Match; form: MatchResult[]; position: number | null }) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center gap-3 text-center md:flex-row md:gap-4", side === "home" ? "md:justify-end md:text-right" : "md:flex-row-reverse md:justify-end md:text-left")}>
      <div className="w-full min-w-0 md:order-1 md:w-auto">
        <h2 className="truncate text-base font-semibold tracking-tight md:text-2xl">
          <span className="md:hidden">{team.shortName}</span>
          <span className="hidden md:inline">{team.name}</span>
        </h2>
        <div className={cn("mt-1.5 flex items-center justify-center gap-2 text-xs text-muted-foreground", side === "home" ? "md:justify-end" : "md:justify-start")}>
          {position !== null && <span className="tabular">{position}ᵉ</span>}
          <FormBadges form={form} size="xs" />
        </div>
      </div>
      <div className="relative md:order-2">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full opacity-30 blur-2xl" style={{ background: team.colors.primary }} />
        <TeamCrest team={team} size="xl" className="size-14 md:size-20" />
      </div>
    </div>
  );
}

export function MatchHero({ match, homeForm, awayForm, homePosition, awayPosition, expectedGoals }: Props) {
  const { timezone } = useApp();
  const { snapshot, connected } = useLive();
  const status = snapshot?.status ?? match.status;
  const minute = snapshot?.minute ?? match.minute;
  const score = snapshot?.score ?? match.score;
  const live = status === "LIVE" || status === "HALFTIME";

  return (
    <section className="card-surface relative overflow-hidden rounded-2xl">
      <div className="hairline-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 text-xs text-muted-foreground">
        <Link href={`/matches?competition=${encodeURIComponent(match.competition.id)}`} className="flex items-center gap-1.5 font-medium text-foreground hover:underline">
          <Trophy className="size-3.5 text-primary" /> {match.competition.country.flag} {match.competition.name}
        </Link>
        {match.round && <span>{match.round}</span>}
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" /> {formatDate(match.kickoff, timezone, { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> {formatTime(match.kickoff, timezone)}
        </span>
        {match.venue && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {match.venue.name}, {match.venue.city}
          </span>
        )}
        {match.isDemo && <DemoBadge label="Match fictif" />}
      </div>

      <div className="relative flex items-center gap-3 px-4 py-8 md:gap-8 md:px-10 md:py-10">
        <HeroTeam side="home" match={match} form={homeForm} position={homePosition} />
        <div className="flex shrink-0 flex-col items-center gap-2">
          {score ? (
            <div className="tabular flex items-center gap-3 text-4xl font-bold tracking-tight md:text-6xl">
              <span>{score.home}</span>
              <span className="text-2xl text-subtle-foreground md:text-4xl">:</span>
              <span>{score.away}</span>
            </div>
          ) : (
            <div className="tabular text-3xl font-semibold tracking-tight md:text-5xl">{formatTime(match.kickoff, timezone)}</div>
          )}
          <div className="flex items-center gap-2">
            {status === "SCHEDULED" ? <span className="text-xs text-muted-foreground">Coup d&apos;envoi</span> : <MatchStatusBadge status={status} minute={minute} />}
          </div>
          {live && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {connected ? <LiveDot className="size-1.5" /> : null}
              {connected ? "Temps réel" : "Mise à jour périodique"}
            </span>
          )}
          {match.halftimeScore && status === "FINISHED" && (
            <span className="tabular text-[11px] text-subtle-foreground">
              MT {match.halftimeScore.home}-{match.halftimeScore.away}
            </span>
          )}
          {expectedGoals && (
            <span className="tabular mt-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">
              Buts attendus {formatNumber(expectedGoals.home, 2)} – {formatNumber(expectedGoals.away, 2)}
            </span>
          )}
        </div>
        <HeroTeam side="away" match={match} form={awayForm} position={awayPosition} />
      </div>
    </section>
  );
}
