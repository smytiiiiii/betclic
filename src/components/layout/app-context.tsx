"use client";

import { createContext, useContext } from "react";
import type { Currency } from "@/lib/domain/settings";

export interface AppContextValue {
  timezone: string;
  currency: Currency;
  isDemo: boolean;
  providerName: string;
  llmConfigured: boolean;
  maxStakePct: number;
  authEnabled: boolean;
  livePollSeconds: number;
  sessionReminderMinutes: number;
  notifications: { stakeAlerts: boolean; lossLimitAlerts: boolean; oddsMovements: boolean; liveEvents: boolean };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
