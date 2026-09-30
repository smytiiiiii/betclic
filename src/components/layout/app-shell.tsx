"use client";

import { Toaster } from "sonner";
import { ResponsibleNotice } from "@/components/common/responsible-notice";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, type AppContextValue } from "./app-context";
import { MobileTabBar } from "./mobile-nav";
import { SessionReminder } from "./session-reminder";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ value, theme, children }: { value: AppContextValue; theme: "dark" | "light" | "system"; children: React.ReactNode }) {
  return (
    <AppProvider value={value}>
      <TooltipProvider>
        <Sidebar />
        <div className="flex min-h-dvh flex-col md:pl-[72px] lg:pl-60">
          <Topbar />
          <main id="main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 pt-6 pb-28 md:px-6 md:pb-10 lg:px-8">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-[1480px] px-4 pb-24 md:px-6 md:pb-6 lg:px-8">
            <div className="border-t border-border pt-4">
              <ResponsibleNotice compact />
            </div>
          </footer>
        </div>
        <MobileTabBar />
        <SessionReminder />
        <Toaster
          theme={theme}
          position="bottom-right"
          toastOptions={{ classNames: { toast: "!bg-surface-2 !border-border-strong !text-foreground", description: "!text-muted-foreground" } }}
        />
      </TooltipProvider>
    </AppProvider>
  );
}
