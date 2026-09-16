import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata = { title: "Страница не найдена" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-8">
        <p className="font-display text-7xl font-medium text-bronze">404</p>
        <h1 className="mt-6 font-display text-4xl leading-[1.12] font-medium text-ink sm:text-5xl">
          Такой страницы нет — но специалисты на месте.
        </h1>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          <ButtonLink href="/catalog">В каталог</ButtonLink>
          <Link
            href="/"
            className="label-caps border-b border-ink/30 pb-1 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
