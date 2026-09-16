import { Skeleton, SkeletonCard, SkeletonPage } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Загружаем каталог специалистов">
      <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-11 w-80 max-w-full" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="hidden space-y-5 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
