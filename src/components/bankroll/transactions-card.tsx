"use client";

import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/layout/app-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BankrollTransaction } from "@/lib/domain/bankroll";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiMutation } from "./use-mutation";

export function TransactionsCard({ transactions }: { transactions: BankrollTransaction[] }) {
  const { currency, timezone } = useApp();
  const { run, pending } = useApiMutation();
  const [amount, setAmount] = useState("");
  const value = Number(amount.replace(",", "."));
  const valid = Number.isFinite(value) && value > 0;

  const submit = async (type: "deposit" | "withdrawal") => {
    if (!valid) return;
    const ok = await run(
      "/api/bankroll/transactions",
      { method: "POST", body: JSON.stringify({ date: new Date().toISOString(), type, amount: value, note: null }) },
      type === "deposit" ? "Dépôt enregistré" : "Retrait enregistré",
    );
    if (ok) setAmount("");
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Dépôts & retraits</CardTitle>
          <CardDescription>Mouvements de fonds de votre bankroll</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input inputMode="decimal" placeholder={`Montant (${currency})`} value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular min-w-40 flex-1" aria-label="Montant" />
          <Button variant="secondary" disabled={!valid || pending} onClick={() => submit("deposit")}>
            <ArrowDownLeft /> Dépôt
          </Button>
          <Button variant="secondary" disabled={!valid || pending} onClick={() => submit("withdrawal")}>
            <ArrowUpRight /> Retrait
          </Button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun mouvement enregistré.</p>
        ) : (
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className={cn("flex size-7 items-center justify-center rounded-md", t.type === "deposit" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative")}>
                  {t.type === "deposit" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                </span>
                <span className="flex-1">
                  {t.type === "deposit" ? "Dépôt" : "Retrait"}
                  <span className="ml-2 text-xs text-muted-foreground">{formatDate(t.date, timezone, { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
                <span className="tabular font-medium">{formatCurrency(t.type === "deposit" ? t.amount : -t.amount, currency, true)}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Supprimer le mouvement">
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce mouvement ?</AlertDialogTitle>
                      <AlertDialogDescription>Le solde sera recalculé. Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => run(`/api/bankroll/transactions/${t.id}`, { method: "DELETE" }, "Mouvement supprimé")}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
