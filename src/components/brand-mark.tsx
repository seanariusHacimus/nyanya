import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * nyanya.uz logo - care symbol (caregiver + child) + serif wordmark.
 * `onDark` swaps to the cream-recolored variant of the same asset for
 * espresso surfaces (header, footer); light surfaces keep the original.
 */
export function BrandMark({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <Image
      src={onDark ? "/nyanya-logo-cream.png" : "/nyanya-logo.png"}
      alt="nyanya.uz"
      width={1470}
      height={386}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );
}
