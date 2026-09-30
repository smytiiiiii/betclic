import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/common/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { publicConfig } from "@/lib/config/env";
import { getProvider } from "@/lib/providers";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  await connection();
  const provider = getProvider();
  const [settings, competitions] = await Promise.all([getSettings(), provider.getCompetitions()]);
  const config = publicConfig();
  return (
    <div>
      <PageHeader title="Paramètres" description="Personnalisez l'interface, vos limites de jeu responsable et les paramètres du moteur statistique." />
      <SettingsForm
        initial={settings}
        competitions={competitions.map((c) => ({ id: c.id, name: c.name, flag: c.country.flag }))}
        integration={{
          providerName: provider.info.name,
          isDemo: provider.info.isDemo,
          capabilities: { ...provider.info.capabilities },
          llmConfigured: config.llmConfigured,
          llmModel: config.llmModel,
          storageDriver: config.storageDriver,
          authEnabled: config.authEnabled,
          timezone: config.timezone,
        }}
      />
    </div>
  );
}
