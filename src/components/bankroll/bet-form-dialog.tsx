"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/layout/app-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BET_STATUS_LABELS, BET_STATUSES, type BetStatus } from "@/lib/domain/bankroll";
import type { BankrollSettings } from "@/lib/domain/settings";
import { checkStake, type BankrollSummary } from "@/lib/services/bankroll-math";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiMutation } from "./use-mutation";

const today = () => new Date().toISOString().slice(0, 10);

export function BetFormDialog({ summary, settings }: { summary: BankrollSummary; settings: BankrollSettings }) {
  const { currency } = useApp();
  const { run, pending } = useApiMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ placedAt: today(), matchLabel: "", competition: "", selection: "", odds: "", stake: "", status: "pending" as BetStatus, modelProbability: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const n = (v: string) => Number(v.replace(",", "."));
  const stake = n(form.stake);
  const check = stake > 0 ? checkStake(stake, summary.balance, settings, summary) : null;
  const blocked = settings.hardLimits && Boolean(check?.exceedsDailyLimit || check?.exceedsWeeklyLimit || summary.daily.exceeded || summary.weekly.exceeded);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.matchLabel.trim().length < 2) e.matchLabel = "Indiquez le match";
    if (!form.selection.trim()) e.selection = "Indiquez la sélection";
    if (!(n(form.odds) >= 1.01)) e.odds = "Cote ≥ 1,01";
    if (!(stake > 0)) e.stake = "Mise positive";
    if (form.modelProbability && !(n(form.modelProbability) >= 0 && n(form.modelProbability) <= 100)) e.modelProbability = "Entre 0 et 100";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (check?.level === "high" && !acknowledged) {
      setAcknowledged(true);
      return;
    }
    const ok = await run(
      "/api/bankroll/bets",
      {
        method: "POST",
        body: JSON.stringify({
          placedAt: form.placedAt,
          matchLabel: form.matchLabel,
          competition: form.competition || null,
          selection: form.selection,
          odds: n(form.odds),
          stake,
          status: form.status,
          modelProbability: form.modelProbability ? n(form.modelProbability) / 100 : null,
          notes: form.notes || null,
        }),
      },
      "Pari enregistré",
    );
    if (ok) {
      setOpen(false);
      setAcknowledged(false);
      setForm({ placedAt: today(), matchLabel: "", competition: "", selection: "", odds: "", stake: "", status: "pending", modelProbability: "", notes: "" });
    }
  };

  const field = (k: keyof typeof form, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`bet-${k}`}>{label}</Label>
      <Input id={`bet-${k}`} value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} {...props} />
      {errors[k] && <p className="text-[11px] text-negative">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setAcknowledged(false); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Ajouter un pari
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Enregistrer un pari</DialogTitle>
          <DialogDescription>Suivi personnel uniquement : Kairos ne prend aucun pari.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("placedAt", "Date", { type: "date" })}
            {field("competition", "Compétition (optionnel)")}
            <div className="sm:col-span-2">{field("matchLabel", "Match", { placeholder: "Équipe A – Équipe B" })}</div>
            <div className="sm:col-span-2">{field("selection", "Sélection", { placeholder: "ex. Over 2.5" })}</div>
            {field("odds", "Cote", { inputMode: "decimal", placeholder: "2,10" })}
            {field("stake", `Mise (${currency})`, { inputMode: "decimal", placeholder: "2" })}
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as BetStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {BET_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field("modelProbability", "Probabilité modèle % (optionnel)", { inputMode: "decimal" })}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="bet-notes">Notes</Label>
              <Textarea id="bet-notes" value={form.notes} onChange={set("notes")} rows={2} maxLength={500} />
            </div>
          </div>

          {check && (
            <div
              className={cn(
                "flex gap-2 rounded-lg border p-3 text-sm",
                check.level === "high" ? "border-negative/30 bg-negative/5 text-negative" : check.level === "caution" ? "border-warning/30 bg-warning/5 text-warning" : "border-border text-muted-foreground",
              )}
              role={check.level === "high" ? "alert" : undefined}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p>
                  Cette mise représente <strong className="tabular">{formatPercent(check.pctOfBankroll, 1)}</strong> de votre solde disponible.
                </p>
                {check.messages.map((m) => (
                  <p key={m}>{m}</p>
                ))}
                {blocked && <p className="mt-1 font-medium">Limites strictes activées : cette mise ne peut pas être enregistrée.</p>}
                {acknowledged && !blocked && <p className="mt-1 font-medium">Cliquez à nouveau pour confirmer cette mise élevée.</p>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={pending} disabled={blocked} variant={acknowledged ? "destructive" : "default"}>
              {acknowledged ? "Confirmer la mise" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
