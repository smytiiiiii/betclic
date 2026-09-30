import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";

export default function MatchNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Match introuvable"
      description="Ce match n'existe pas ou n'est plus disponible auprès de la source de données."
      action={
        <Button asChild>
          <Link href="/matches">Voir les matchs</Link>
        </Button>
      }
    />
  );
}
