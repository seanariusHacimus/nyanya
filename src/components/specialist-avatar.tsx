import Image from "next/image";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Shows the generated portrait when available, else an on-brand monogram
 * (initials on a royal→champagne gradient) — reads as intentional, not missing.
 */
export function SpecialistAvatar({
  name,
  photoKey,
  className,
  rounded = "rounded-2xl",
  monogramClass = "text-5xl",
}: {
  name: string;
  photoKey?: string | null;
  className?: string;
  rounded?: string;
  monogramClass?: string;
}) {
  if (photoKey) {
    return (
      <div className={cn("relative overflow-hidden", rounded, className)}>
        <Image
          src={photoKey}
          alt={name}
          fill
          sizes="(max-width: 768px) 50vw, 320px"
          className="object-cover object-top"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-gradient-to-br from-royal-soft via-royal to-royal-deep",
        rounded,
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 [background:radial-gradient(circle_at_70%_22%,var(--champagne),transparent_46%)]"
      />
      <span className={cn("font-display font-semibold text-champagne-soft", monogramClass)}>
        {initials(name)}
      </span>
    </div>
  );
}
