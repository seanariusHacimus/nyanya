import Image from "next/image";
import { cn } from "@/lib/utils";

/** nyanya.uz logo — care symbol (caregiver + child) + Cormorant wordmark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/nyanya-logo.png"
      alt="nyanya.uz"
      width={1470}
      height={386}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );
}
