import Link from "next/link";
import { SealCheck } from "@phosphor-icons/react";
import { PREMIUM_BENEFITS } from "@/lib/specialists-shared";

/**
 * Плашка премиума в кабинете.
 *
 * Показывается после отправки анкеты — когда человек уже вложился и готов
 * вложиться ещё немного, — и только пока профиль не премиум. Слова выгод
 * берутся из PREMIUM_BENEFITS: те же, что на странице документов и в письмах.
 */
export function PremiumCard() {
  return (
    <section className="mt-4 border border-bronze/50 bg-cream-deep p-6">
      <p className="flex items-center gap-2 text-base font-semibold text-ink">
        <SealCheck size={20} className="text-bronze" aria-hidden="true" />
        Премиум-профиль
      </p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
        Предоставьте паспорт и справки — модератор проверит их, и анкета
        получит отметку о проверке.
      </p>
      <ul className="mt-4 grid gap-1.5 text-sm text-ink">
        {PREMIUM_BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-2.5">
            <span className="text-bronze" aria-hidden="true">
              ·
            </span>
            {b.title}
          </li>
        ))}
      </ul>
      <Link
        href="/specialist/premium"
        className="label-caps mt-5 inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px sm:w-auto sm:px-8"
      >
        Подробнее и документы
      </Link>
    </section>
  );
}
