import Link from "next/link";
import type { ReactNode } from "react";

const variants = {
  /** Тёмная кнопка на светлом фоне */
  dark: "bg-ink text-cream hover:bg-charcoal",
  /** Бронзовая кнопка на тёмном фоне */
  bronze: "bg-bronze-soft text-ink hover:bg-[#cfb27c]",
  /** Контурная кнопка на тёмном фоне */
  "outline-light":
    "border border-cream/40 text-cream hover:border-cream/70 hover:bg-cream/5",
} as const;

export function ButtonLink({
  href,
  variant = "dark",
  children,
  className = "",
  onClick,
}: {
  href: string;
  variant?: keyof typeof variants;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`label-caps inline-flex min-h-12 items-center justify-center px-8 text-center whitespace-nowrap transition-colors duration-300 active:translate-y-px ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
