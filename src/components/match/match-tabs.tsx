"use client";

import { Activity, BarChart3, Compass, History, ListChecks, Radio, Swords, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface TabDef {
  value: string;
  label: string;
  icon: "overview" | "markets" | "form" | "stats" | "h2h" | "context" | "live" | "history";
  content: React.ReactNode;
}

const ICONS = { overview: Compass, markets: ListChecks, form: TrendingUp, stats: BarChart3, h2h: Swords, context: Activity, live: Radio, history: History };

/** Onglets synchronisés avec le hash de l'URL (#markets, #form…). */
export function MatchTabs({ tabs, defaultValue }: { tabs: TabDef[]; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace("#", "");
      if (tabs.some((t) => t.value === hash)) setValue(hash);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [tabs]);

  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        setValue(v);
        history.replaceState(null, "", `#${v}`);
      }}
    >
      <div className="sticky top-16 z-10 -mx-4 bg-background/80 px-4 py-2 backdrop-blur-xl md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <TabsList className="w-full justify-start md:w-auto">
          {tabs.map((t) => {
            const Icon = ICONS[t.icon];
            return (
              <TabsTrigger key={t.value} value={t.value}>
                <Icon /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-4">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
