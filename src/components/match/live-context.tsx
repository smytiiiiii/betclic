"use client";

import { createContext, useContext } from "react";
import { useApp } from "@/components/layout/app-context";
import { useLiveMatch } from "@/hooks/use-live-match";
import type { MatchStatus } from "@/lib/domain/types";

type LiveValue = ReturnType<typeof useLiveMatch>;
const LiveContext = createContext<LiveValue | null>(null);

/** Une seule connexion temps réel partagée par tous les composants de la page match. */
export function LiveMatchProvider({ matchId, status, kickoff, children }: { matchId: string; status: MatchStatus; kickoff: string; children: React.ReactNode }) {
  const { livePollSeconds } = useApp();
  const value = useLiveMatch(matchId, status, kickoff, livePollSeconds);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveValue {
  const v = useContext(LiveContext);
  if (!v) throw new Error("useLive doit être utilisé dans <LiveMatchProvider>");
  return v;
}
