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
 * в Telegram владельцу (см. /api/contact).
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
          {/* CT4 — реквизиты (⛳ заглушка до реальных данных юрлица) */}
          <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
            ООО «NYANYA», г. Ташкент, Узбекистан.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
