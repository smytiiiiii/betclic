import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy aria-label="Chargement de l'analyse">
      <Skeleton className="h-8 w-24" />
      <div className="card-surface rounded-2xl">
        <div className="flex justify-center border-b border-border py-3">
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex items-center justify-between gap-6 px-6 py-10 md:px-16">
          <div className="flex flex-1 items-center justify-end gap-4">
            <Skeleton className="hidden h-6 w-40 md:block" />
            <Skeleton className="size-20 rounded-full" />
          </div>
          <Skeleton className="h-14 w-32" />
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="hidden h-6 w-40 md:block" />
          </div>
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid gap-4 xl:grid-cols-5">
        <Skeleton className="h-96 xl:col-span-3" />
        <Skeleton className="h-96 xl:col-span-2" />
      </div>
    </div>
  );
}
