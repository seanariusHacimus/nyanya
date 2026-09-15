import { PageHero } from "@/components/ui/page-hero";
import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Контакты",
  description: "Напишите нам через форму обращения на сайте nyanya.uz.",
};

/**
 * Почта, Telegram, Instagram и часы работы убраны по решению владельца:
 * публичных контактов у площадки пока нет, а показывать нерабочие адреса
 * хуже, чем не показывать никаких. Обращения принимает форма — она уходит
 * владельцу письмом (см. /api/contact). Исключение — текст формы при 429
 * называет info@nyanya.uz (формулировка владельца, 2026-09-16); принимает ли
 * этот ящик почту, не подтверждено — см. CLAUDE.md, «Rate-limit counters».
 */
export default function ContactsPage() {
  return (
    <main className="flex-1">
      <PageHero
        title="Контакты"
        subtitle="Напишите нам — ответим на вашу почту."
      />

      <section className="mx-auto max-w-[680px] px-5 py-16 sm:px-8 lg:py-24">
        <Reveal>
          <h2 className="font-display text-2xl font-medium text-ink">
            Форма обращения
          </h2>
          <div className="mt-6">
            <ContactForm />
          </div>
          {/* CT4 — реквизиты (⛳ юрлицо ещё не зарегистрировано, 2026-09-11) */}
          <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
            nyanya.uz, г. Ташкент, Узбекистан.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
