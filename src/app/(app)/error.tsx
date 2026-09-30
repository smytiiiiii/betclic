"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      title="Impossible d'afficher cette page"
      description="Une erreur est survenue lors du chargement des données. Vous pouvez réessayer ; si le problème persiste, vérifiez la configuration de la source de données."
      action={
        <Button onClick={reset}>
          <RotateCcw /> Réessayer
        </Button>
      }
    />
  );
}
