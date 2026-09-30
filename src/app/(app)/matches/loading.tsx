import { MatchRowSkeleton } from "@/components/matches/match-row";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-9 w-full" />
      <div className="card-surface divide-y divide-border rounded-xl">
        {Array.from({ length: 8 }, (_, i) => (
          <MatchRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
