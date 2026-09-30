import { Compass } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page introuvable"
      description="La page demandée n'existe pas."
      action={
        <Button asChild>
          <Link href="/">Retour au tableau de bord</Link>
        </Button>
      }
    />
  );
}
