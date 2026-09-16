import { Skeleton, SkeletonPage } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Загружаем анкету специалиста">
      <div className="mx-auto max-w-[1100px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="space-y-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-28 w-full" />
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-12 w-56" />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
