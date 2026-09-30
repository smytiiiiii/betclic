"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { useApiMutation } from "./use-mutation";

export function ResetBankroll() {
  const { run, pending } = useApiMutation();
  const [text, setText] = useState("");
  return (
    <AlertDialog onOpenChange={() => setText("")}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-negative hover:text-negative">
          <RotateCcw /> Réinitialiser
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser la bankroll ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tous les paris et mouvements seront définitivement supprimés. Vos paramètres sont conservés. Tapez <strong>RESET</strong> pour confirmer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="RESET" aria-label="Confirmation" />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={text !== "RESET" || pending}
            onClick={() => run("/api/bankroll/reset", { method: "POST", body: JSON.stringify({ confirm: "RESET" }) }, "Bankroll réinitialisée")}
          >
            Tout supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
