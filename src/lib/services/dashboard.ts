import "server-only";
import { cache } from "react";
import { env } from "@/lib/config/env";
import type { Competition } from "@/lib/domain/types";
import { getProvider } from "@/lib/providers";
import { addDays, zonedDayRange } from "@/lib/time";
import { buildMatchCards } from "./analysis";
import { getBankrollState } from "./bankroll";
import type { MatchCardDTO } from "./dto";
import { getMatchesForDay, todayKey } from "./matches";
import { getOpportunities } from "./opportunities";
import { getSettings } from "./settings";

export interface DashboardAlert {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  href?: string;
}

export interface CompetitionTrend {
  competition: Competition;
  matches: number;
  goalsPerMatch: number;
  over25Rate: number;
  bttsRate: number;
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
}

export interface DashboardData {
  today: string;
  isDemo: boolean;
  todayCards: MatchCardDTO[];
  upcomingCards: MatchCardDTO[];
  recentCards: MatchCardDTO[];
  liveCount: number;
  analysesAvailable: number;
  probabilitiesComputed: number;
  opportunitiesCount: number;
  topOpportunities: Awaited<ReturnType<typeof getOpportunities>>["items"];
  trends: CompetitionTrend[];
  alerts: DashboardAlert[];
}

const DAY = 86_400_000;

async function competitionTrends(favorites: string[]): Promise<CompetitionTrend[]> {
  const provider = getProvider();
  const competitions = await provider.getCompetitions();
  const now = Date.now();
  const trends = await Promise.all(
    competitions.map(async (competition) => {
      const matches = (
        await provider.getMatches({
          competitionId: competition.id,
          from: new Date(now - 60 * DAY).toISOString(),
          to: new Date(now).toISOString(),
          status: ["FINISHED"],
        })
      ).filter((m) => m.score);
      const n = matches.length || 1;
      const rate = (pred: (h: number, a: number) => boolean) => matches.filter((m) => pred(m.score!.home, m.score!.away)).length / n;
      return {
        competition,
        matches: matches.length,
        goalsPerMatch: matches.reduce((s, m) => s + m.score!.home + m.score!.away, 0) / n,
        over25Rate: rate((h, a) => h + a > 2.5),
        bttsRate: rate((h, a) => h > 0 && a > 0),
        homeWinRate: rate((h, a) => h > a),
        drawRate: rate((h, a) => h === a),
        awayWinRate: rate((h, a) => h < a),
      };
    }),
  );
  return trends
    .filter((t) => t.matches > 0)
    .sort((a, b) => Number(favorites.includes(b.competition.id)) - Number(favorites.includes(a.competition.id)) || b.goalsPerMatch - a.goalsPerMatch);
}

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const provider = getProvider();
  const tz = env().APP_TIMEZONE;
  const today = todayKey();
  const settings = await getSettings();

  const [todayMatches, upcomingRaw, recentRaw, opportunities, trends, bankroll] = await Promise.all([
    getMatchesForDay(today),
    provider.getMatches({
      from: zonedDayRange(addDays(today, 1), tz).start.toISOString(),
      to: zonedDayRange(addDays(today, 3), tz).end.toISOString(),
      status: ["SCHEDULED"],
    }),
    provider.getMatches({
      from: new Date(Date.now() - 2 * DAY).toISOString(),
      to: new Date().toISOString(),
      status: ["FINISHED"],
    }),
    getOpportunities(),
    competitionTrends(settings.favoriteCompetitions),
    getBankrollState(),
  ]);

  const favorites = settings.favoriteCompetitions;
  const byFavorite = <T extends { competition: { id: string } }>(a: T, b: T) =>
    Number(favorites.includes(b.competition.id)) - Number(favorites.includes(a.competition.id));

  const [todayCards, upcomingCards, recentCards] = await Promise.all([
    buildMatchCards(todayMatches.slice().sort(byFavorite)),
    buildMatchCards(upcomingRaw.slice().sort(byFavorite).slice(0, 8)),
    buildMatchCards(recentRaw.slice(-8).reverse()),
  ]);

  const analysed = todayCards.filter((c) => c.probabilities !== null);
  const alerts: DashboardAlert[] = [];
  const liveCount = todayMatches.filter((m) => m.status === "LIVE" || m.status === "HALFTIME").length;

  if (provider.info.isDemo) {
    alerts.push({
      id: "demo",
      level: "info",
      title: "Mode démonstration",
      message: "Aucune API sportive n'est configurée : équipes, matchs, statistiques et cotes sont fictifs.",
      href: "/settings#data",
    });
  }
  const { summary } = bankroll;
  const notify = settings.notifications;
  if (notify.lossLimitAlerts && (summary.daily.exceeded || summary.weekly.exceeded)) {
    alerts.push({
      id: "loss-limit",
      level: "critical",
      title: "Limite de perte atteinte",
      message: "Vous avez atteint une limite de perte que vous vous êtes fixée. Prenez une pause.",
      href: "/responsible-gaming",
    });
  } else if (notify.lossLimitAlerts && summary.daily.enabled && summary.daily.remaining !== null && summary.daily.remaining < summary.daily.limit * 0.25) {
    alerts.push({
      id: "loss-near",
      level: "warning",
      title: "Proche de votre limite journalière",
      message: `Il reste ${summary.daily.remaining} avant d'atteindre votre limite de perte du jour.`,
      href: "/bankroll",
    });
  }
  const oversized = bankroll.bets.filter(
    (b) => b.status === "pending" && summary.balance + summary.pendingStake > 0 && b.stake / (summary.balance + summary.pendingStake) > settings.bankroll.maxStakePct / 100,
  );
  if (notify.stakeAlerts && oversized.length) {
    alerts.push({
      id: "oversized",
      level: "warning",
      title: "Mises élevées en cours",
      message: `${oversized.length} mise(s) en cours dépasse(nt) ${settings.bankroll.maxStakePct} % de votre bankroll.`,
      href: "/bankroll",
    });
  }
  const lowData = todayCards.filter((c) => c.dataQuality !== null && c.dataQuality < 45).length;
  if (lowData) {
    alerts.push({
      id: "low-data",
      level: "info",
      title: "Données limitées",
      message: `${lowData} match(s) du jour ont une qualité de données faible : interprétez les probabilités avec prudence.`,
      href: "/matches",
    });
  }
  if (liveCount) {
    alerts.push({
      id: "live",
      level: "info",
      title: `${liveCount} match(s) en direct`,
      message: "Scores et événements mis à jour en temps réel sur la page du match.",
      href: "/matches?status=live",
    });
  }

  return {
    today,
    isDemo: provider.info.isDemo,
    todayCards,
    upcomingCards,
    recentCards,
    liveCount,
    analysesAvailable: analysed.length + upcomingCards.filter((c) => c.probabilities !== null).length,
    probabilitiesComputed: todayCards.reduce((s, c) => s + c.marketCount, 0),
    opportunitiesCount: opportunities.items.length,
    topOpportunities: opportunities.items.slice(0, 5),
    trends,
    alerts,
  };
});
