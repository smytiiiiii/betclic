"use client";

import { Bell, Brain, Database, Globe, Monitor, Moon, Palette, RotateCcw, Save, Star, Sun, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InfoTip } from "@/components/common/info-tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  CURRENCIES,
  DEFAULT_MODEL_SETTINGS,
  FACTOR_KEYS,
  FACTOR_LABELS,
  appSettingsSchema,
  type AppSettings,
} from "@/lib/domain/settings";
import { cn } from "@/lib/utils";

export interface IntegrationInfo {
  providerName: string;
  isDemo: boolean;
  capabilities: Record<string, boolean>;
  llmConfigured: boolean;
  llmModel: string | null;
  storageDriver: string;
  authEnabled: boolean;
  timezone: string;
}

const CURRENCY_LABELS: Record<string, string> = { EUR: "Euro (€)", USD: "Dollar US ($)", GBP: "Livre sterling (£)", CHF: "Franc suisse (CHF)", CAD: "Dollar canadien (CA$)" };
const CAPABILITY_LABELS: Record<string, string> = { odds: "Cotes", xg: "xG", corners: "Corners", availability: "Absences", live: "Temps réel", standings: "Classements" };

function Section({ id, icon: Icon, title, description, children }: { id: string; icon: typeof Palette; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
            <Icon className="size-4" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0 sm:w-64">{children}</div>
    </div>
  );
}

function NumberField({ value, onChange, min, max, step = 1, suffix, id }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string; id?: string }) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className={cn("tabular", suffix && "pr-12")}
        aria-invalid={!Number.isFinite(value) || value < min || value > max}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function SliderRow({ label, hint, value, min, max, step, format, onChange }: { label: string; hint?: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          {label}
          {hint && <InfoTip>{hint}</InfoTip>}
        </span>
        <span className="tabular text-xs text-muted-foreground">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}

export function SettingsForm({ initial, competitions, integration }: { initial: AppSettings; competitions: { id: string; name: string; flag: string }[]; integration: IntegrationInfo }) {
  const router = useRouter();
  const [s, setS] = useState<AppSettings>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(initial), [s, initial]);
  const validation = appSettingsSchema.safeParse(s);
  const totalWeight = FACTOR_KEYS.reduce((a, k) => a + s.model.weights[k], 0);

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const patchModel = (value: Partial<AppSettings["model"]>) => setS((prev) => ({ ...prev, model: { ...prev.model, ...value } }));
  const patchBankroll = (value: Partial<AppSettings["bankroll"]>) => setS((prev) => ({ ...prev, bankroll: { ...prev.bankroll, ...value } }));
  const patchNotif = (value: Partial<AppSettings["notifications"]>) => setS((prev) => ({ ...prev, notifications: { ...prev.notifications, ...value } }));

  const save = async () => {
    if (!validation.success) {
      toast.error("Certains paramètres sont invalides", { description: validation.error.issues[0]?.message });
      return;
    }
    if (totalWeight === 0) {
      toast.error("Au moins un facteur doit avoir une pondération non nulle");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Enregistrement impossible");
      toast.success("Paramètres enregistrés", { description: "Les analyses sont recalculées avec vos nouveaux paramètres." });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    { v: "dark", l: "Sombre", i: Moon },
    { v: "light", l: "Clair", i: Sun },
    { v: "system", l: "Système", i: Monitor },
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav className="hidden lg:block" aria-label="Sections">
        <ul className="sticky top-24 space-y-1 text-sm">
          {[
            ["appearance", "Apparence"],
            ["preferences", "Préférences"],
            ["notifications", "Notifications"],
            ["competitions", "Compétitions"],
            ["bankroll", "Gestion bankroll"],
            ["model", "Paramètres du modèle"],
            ["data", "Données & intégrations"],
          ].map(([id, l]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
                {l}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4 pb-20">
        <Section id="appearance" icon={Palette} title="Apparence" description="Thème de l'interface">
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => patch("theme", t.v)}
                aria-pressed={s.theme === t.v}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm transition-colors",
                  s.theme === t.v ? "border-primary/50 bg-primary-soft" : "border-border hover:border-border-strong",
                )}
              >
                <t.i className={cn("size-5", s.theme === t.v ? "text-primary" : "text-muted-foreground")} />
                {t.l}
              </button>
            ))}
          </div>
        </Section>

        <Section id="preferences" icon={Globe} title="Préférences" description="Devise, langue et fuseau horaire">
          <Row label="Devise" hint="Utilisée pour la bankroll et les simulations">
            <Select value={s.currency} onValueChange={(v) => patch("currency", v as AppSettings["currency"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CURRENCY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Langue" hint="D'autres langues pourront être ajoutées ultérieurement">
            <Select value={s.language} onValueChange={() => undefined}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en" disabled>
                  English (bientôt)
                </SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Fuseau horaire" hint="Défini côté serveur par APP_TIMEZONE">
            <Input value={integration.timezone} readOnly className="text-muted-foreground" />
          </Row>
        </Section>

        <Section id="notifications" icon={Bell} title="Notifications" description="Alertes affichées dans l'application">
          <Row label="Alerte de mise excessive" hint="Avertit quand une mise dépasse votre seuil">
            <div className="flex justify-end">
              <Switch checked={s.notifications.stakeAlerts} onCheckedChange={(v) => patchNotif({ stakeAlerts: v })} aria-label="Alerte de mise excessive" />
            </div>
          </Row>
          <Row label="Alerte de limite de perte" hint="Tableau de bord et bankroll">
            <div className="flex justify-end">
              <Switch checked={s.notifications.lossLimitAlerts} onCheckedChange={(v) => patchNotif({ lossLimitAlerts: v })} aria-label="Alerte de limite de perte" />
            </div>
          </Row>
          <Row label="Mouvements de cotes" hint="Mise en évidence des variations importantes">
            <div className="flex justify-end">
              <Switch checked={s.notifications.oddsMovements} onCheckedChange={(v) => patchNotif({ oddsMovements: v })} aria-label="Mouvements de cotes" />
            </div>
          </Row>
          <Row label="Événements en direct" hint="Buts et cartons rouges sur la page d'un match">
            <div className="flex justify-end">
              <Switch checked={s.notifications.liveEvents} onCheckedChange={(v) => patchNotif({ liveEvents: v })} aria-label="Événements en direct" />
            </div>
          </Row>
          <Row label="Rappel de pause" hint="Message de jeu responsable après une durée d'utilisation (0 = désactivé)">
            <NumberField value={s.notifications.sessionReminderMinutes} onChange={(v) => patchNotif({ sessionReminderMinutes: v })} min={0} max={480} step={5} suffix="min" />
          </Row>
        </Section>

        <Section id="competitions" icon={Star} title="Compétitions favorites" description="Mises en avant sur le tableau de bord">
          <div className="flex flex-wrap gap-2">
            {competitions.map((c) => {
              const on = s.favoriteCompetitions.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch("favoriteCompetitions", on ? s.favoriteCompetitions.filter((x) => x !== c.id) : [...s.favoriteCompetitions, c.id])}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    on ? "border-primary/50 bg-primary-soft text-foreground" : "border-border text-muted-foreground hover:border-border-strong",
                  )}
                >
                  <span>{c.flag}</span>
                  {c.name}
                  {on && <Star className="size-3.5 fill-primary text-primary" />}
                </button>
              );
            })}
          </div>
        </Section>

        <Section id="bankroll" icon={Wallet} title="Gestion de la bankroll" description="Capital de départ et limites de jeu responsable">
          <Row label="Bankroll initiale" hint={`En ${s.currency}`}>
            <NumberField value={s.bankroll.initialBankroll} onChange={(v) => patchBankroll({ initialBankroll: v })} min={0} max={10_000_000} step={10} />
          </Row>
          <Row label="Seuil d'alerte par mise" hint="Alerte si une mise dépasse ce pourcentage de la bankroll">
            <NumberField value={s.bankroll.maxStakePct} onChange={(v) => patchBankroll({ maxStakePct: v })} min={0.5} max={100} step={0.5} suffix="%" />
          </Row>
          <Row label="Limite de perte journalière" hint="0 = désactivée">
            <NumberField value={s.bankroll.dailyLossLimit} onChange={(v) => patchBankroll({ dailyLossLimit: v })} min={0} max={10_000_000} step={5} suffix={s.currency} />
          </Row>
          <Row label="Limite de perte sur 7 jours" hint="0 = désactivée">
            <NumberField value={s.bankroll.weeklyLossLimit} onChange={(v) => patchBankroll({ weeklyLossLimit: v })} min={0} max={10_000_000} step={10} suffix={s.currency} />
          </Row>
          <Row label="Limites strictes" hint="Bloque l'enregistrement d'une mise qui dépasserait une limite de perte">
            <div className="flex justify-end">
              <Switch checked={s.bankroll.hardLimits} onCheckedChange={(v) => patchBankroll({ hardLimits: v })} aria-label="Limites strictes" />
            </div>
          </Row>
        </Section>

        <Section id="model" icon={Brain} title="Paramètres du modèle" description="Pondérations du score analytique et réglages statistiques">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Pondérations des facteurs</p>
              <span className="tabular text-xs text-muted-foreground">Total : {totalWeight} (normalisé à 100 %)</span>
            </div>
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {FACTOR_KEYS.map((k) => (
                <SliderRow
                  key={k}
                  label={FACTOR_LABELS[k]}
                  value={s.model.weights[k]}
                  min={0}
                  max={40}
                  step={1}
                  format={(v) => `${v} (${totalWeight ? Math.round((v / totalWeight) * 100) : 0} %)`}
                  onChange={(v) => patchModel({ weights: { ...s.model.weights, [k]: v } })}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-x-8 gap-y-4 border-t border-border pt-5 md:grid-cols-2">
            <SliderRow label="Influence du score sur les buts attendus" hint="Ajustement maximal appliqué aux buts attendus par les facteurs non capturés (forme, repos, confrontations, absences)." value={s.model.scoreInfluence} min={0} max={0.4} step={0.01} format={(v) => `±${Math.round(v * 100)} %`} onChange={(v) => patchModel({ scoreInfluence: v })} />
            <SliderRow label="Poids du xG" hint="Part des xG dans l'estimation des buts attendus (lorsqu'ils sont disponibles)." value={s.model.xgBlend} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => patchModel({ xgBlend: v })} />
            <SliderRow label="Matchs analysés par équipe" value={s.model.formWindow} min={5} max={30} step={1} format={(v) => `${v} matchs`} onChange={(v) => patchModel({ formWindow: v })} />
            <SliderRow label="Demi-vie de récence" hint="Un match joué il y a N matchs pèse deux fois moins que le plus récent." value={s.model.recencyHalfLife} min={1} max={30} step={1} format={(v) => `${v} matchs`} onChange={(v) => patchModel({ recencyHalfLife: v })} />
            <SliderRow label="Rétrécissement vers la moyenne" hint="Plus la valeur est élevée, plus les estimations sont ramenées vers la moyenne du championnat (réduit le bruit des petits échantillons)." value={s.model.priorMatches} min={0} max={30} step={1} format={(v) => `${v} matchs`} onChange={(v) => patchModel({ priorMatches: v })} />
            <SliderRow label="Corrélation Dixon-Coles (ρ)" hint="Correction des scores faibles (0-0, 1-0, 0-1, 1-1)." value={s.model.dixonColesRho} min={-0.2} max={0.2} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => patchModel({ dixonColesRho: v })} />
            <SliderRow label="Écart minimum (opportunités)" value={s.model.minEdge} min={0} max={30} step={0.5} format={(v) => `+${v} pts`} onChange={(v) => patchModel({ minEdge: v })} />
            <SliderRow label="Confiance minimum (opportunités)" value={s.model.minConfidence} min={0} max={100} step={5} format={(v) => `${v}/100`} onChange={(v) => patchModel({ minConfidence: v })} />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => patch("model", DEFAULT_MODEL_SETTINGS)}>
            <RotateCcw /> Valeurs par défaut du modèle
          </Button>
        </Section>

        <Section id="data" icon={Database} title="Données & intégrations" description="Configuration serveur (lecture seule, via .env.local)">
          <Row label="Source de données sportives" hint={integration.isDemo ? "Définissez SPORTS_API_PROVIDER et SPORTS_API_KEY pour une source réelle" : undefined}>
            <div className="flex justify-end">
              <Badge variant={integration.isDemo ? "warning" : "positive"}>{integration.providerName}</Badge>
            </div>
          </Row>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(integration.capabilities).map(([k, v]) => (
              <Badge key={k} variant={v ? "default" : "outline"} className={cn(!v && "opacity-50")}>
                {CAPABILITY_LABELS[k] ?? k} {v ? "✓" : "—"}
              </Badge>
            ))}
          </div>
          <Row label="IA explicative" hint={integration.llmConfigured ? undefined : "ANTHROPIC_API_KEY absente : explications générées sans LLM"}>
            <div className="flex justify-end">
              <Badge variant={integration.llmConfigured ? "positive" : "default"}>{integration.llmConfigured ? integration.llmModel : "Modèle de texte déterministe"}</Badge>
            </div>
          </Row>
          <Row label="Stockage" hint={integration.storageDriver === "file" ? "Fichier JSON local (définissez DATABASE_URL pour PostgreSQL)" : "PostgreSQL via Prisma"}>
            <div className="flex justify-end">
              <Badge>{integration.storageDriver === "file" ? "Fichier local" : "PostgreSQL"}</Badge>
            </div>
          </Row>
          <Row label="Protection par mot de passe" hint="APP_ACCESS_PASSWORD">
            <div className="flex justify-end">
              <Badge variant={integration.authEnabled ? "positive" : "default"}>{integration.authEnabled ? "Activée" : "Désactivée"}</Badge>
            </div>
          </Row>
        </Section>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 backdrop-blur-xl transition-transform duration-300 md:bottom-0 md:left-[72px] lg:left-60",
          dirty ? "translate-y-0" : "translate-y-[200%]",
        )}
      >
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">{validation.success ? "Modifications non enregistrées" : "Certaines valeurs sont invalides"}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setS(initial)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} loading={saving} disabled={!validation.success}>
              <Save /> Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
