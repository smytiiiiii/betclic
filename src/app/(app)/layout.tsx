import { AppShell } from "@/components/layout/app-shell";
import { publicConfig } from "@/lib/config/env";
import { getProvider } from "@/lib/providers";
import { getSettings } from "@/lib/services/settings";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [settings, config] = await Promise.all([getSettings(), Promise.resolve(publicConfig())]);
  const provider = getProvider();
  return (
    <AppShell
      theme={settings.theme}
      value={{
        timezone: config.timezone,
        currency: settings.currency,
        isDemo: provider.info.isDemo,
        providerName: provider.info.name,
        llmConfigured: config.llmConfigured,
        maxStakePct: settings.bankroll.maxStakePct,
        authEnabled: config.authEnabled,
        livePollSeconds: config.livePollSeconds,
        sessionReminderMinutes: settings.notifications.sessionReminderMinutes,
        notifications: {
          stakeAlerts: settings.notifications.stakeAlerts,
          lossLimitAlerts: settings.notifications.lossLimitAlerts,
          oddsMovements: settings.notifications.oddsMovements,
          liveEvents: settings.notifications.liveEvents,
        },
      }}
    >
      {children}
    </AppShell>
  );
}
