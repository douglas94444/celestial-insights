import { Skeleton } from "@/components/ui/skeleton";

/** Estado de carregamento inicial da sessão (substitui texto «Carregando…»). */
export function AuthenticatedSessionSkeleton() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-14 shrink-0 flex-col gap-2 border-r bg-sidebar p-2 md:flex lg:w-56">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex flex-1 flex-col gap-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          <Skeleton className="h-5 min-w-0 flex-1 max-w-[14rem]" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-72 w-full max-w-3xl rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
