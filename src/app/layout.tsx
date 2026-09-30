import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { DEFAULT_SETTINGS } from "@/lib/domain/settings";
import { getSettings } from "@/lib/services/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kairos — Analyse football", template: "%s · Kairos" },
  description:
    "Plateforme d'analyse statistique de matchs de football : probabilités, écarts de cotes, combinés, bankroll. Analyses statistiques, aucune garantie de résultat.",
  applicationName: "Kairos",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#07090a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Thème lu à chaque requête (paramètres persistés côté serveur).
  await connection();
  const settings = await getSettings().catch(() => DEFAULT_SETTINGS);
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable} ${settings.theme} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
