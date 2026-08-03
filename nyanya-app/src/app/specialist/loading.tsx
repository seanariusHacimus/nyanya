import { Skeleton, SkeletonPage } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="Загружаем кабинет специалиста">
      <div className="mx-auto max-w-[900px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-12 w-64 max-w-full" />
        <Skeleton className="mt-10 h-28 w-full" />
        <Skeleton className="mt-12 h-8 w-48" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
