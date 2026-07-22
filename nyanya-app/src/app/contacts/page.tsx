import {
  Phone,
  TelegramLogo,
  EnvelopeSimple,
  InstagramLogo,
} from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/ui/page-hero";
import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Контакты",
  description:
    "Свяжитесь с nyanya.uz: телефон, Telegram, email. Отвечаем ежедневно с 9:00 до 21:00.",
};

// ⛳ каналы-заглушки — единый источник с футером (2.6), заменить до запуска
const channels = [
  {
    icon: Phone,
    label: "Телефон",
    value: "+998 90 123 45 67",
    href: "tel:+998901234567",
  },
  {
    icon: TelegramLogo,
    label: "Telegram",
    value: "@nyanya_uz",
    href: "https://t.me/nyanya_uz",
  },
  {
    icon: EnvelopeSimple,
    label: "Email",
    value: "info@nyanya.uz",
    href: "mailto:info@nyanya.uz",
  },
  {
    icon: InstagramLogo,
    label: "Instagram",
    value: "@nyanya.uz",
    href: "https://instagram.com/nyanya.uz",
  },
];

export default function ContactsPage() {
  return (
    <main className="flex-1">
      <PageHero
        title="Контакты"
        subtitle="Отвечаем ежедневно с 9:00 до 21:00."
      />

      <section className="mx-auto grid max-w-[1400px] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-24">
        {/* CT2 — каналы */}
        <Reveal>
          <ul className="divide-y divide-line border-y border-line">
            {channels.map((channel) => (
              <li key={channel.label}>
                <a
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    channel.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="group flex items-center gap-5 py-5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-bronze/40">
                    <channel.icon size={20} weight="thin" className="text-bronze" />
                  </span>
                  <span>
                    <span className="label-caps block text-ink-faint">
                      {channel.label}
                    </span>
                    <span className="mt-1 block text-lg font-medium text-ink transition-colors duration-300 group-hover:text-bronze-text">
                      {channel.value}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {/* CT4 — реквизиты (⛳ заглушка до реальных данных юрлица) */}
          <p className="mt-8 text-xs leading-relaxed text-ink-faint">
            ООО «NYANYA», г. Ташкент, Узбекистан.
          </p>
        </Reveal>

        {/* CT3 — форма обращения */}
        <Reveal delay={0.1}>
          <h2 className="font-display text-2xl font-medium text-ink">
            Форма обращения
          </h2>
          <div className="mt-6">
            <ContactForm />
          </div>
        </Reveal>
      </section>
    </main>
  );
}
