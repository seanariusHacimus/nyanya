import { cn } from "@/lib/utils";

/** Gold seal + Cormorant wordmark. The seal echoes the trust-medallion signature. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-9 place-items-center rounded-full bg-royal">
        <span className="absolute inset-[3px] rounded-full border border-champagne/50" />
        <span className="font-display text-lg font-semibold text-champagne">N</span>
      </span>
      <span className="font-display text-2xl font-semibold leading-none tracking-tight text-ink">
        Nanya<span className="text-champagne">.uz</span>
      </span>
    </span>
  );
}
