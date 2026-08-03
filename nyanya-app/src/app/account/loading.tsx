import { Skeleton, SkeletonCard, SkeletonPage } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Загружаем кабинет">
      <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-12 w-72 max-w-full" />
        <Skeleton className="mt-8 h-5 w-96 max-w-full" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
