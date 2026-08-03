import { Skeleton, SkeletonPage } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Загружаем админ-панель">
      <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-12 w-96 max-w-full" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="mt-14 h-9 w-72" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
