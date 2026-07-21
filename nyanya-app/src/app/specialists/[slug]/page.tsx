import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, SealCheck } from "@phosphor-icons/react/dist/ssr";
import {
  specialists,
  getSpecialist,
  similarSpecialists,
  categories,
  formatPrice,
  UNLOCK_FEE_UZS,
} from "@/content/specialists";
import { SpecialistCard } from "@/components/specialist-card";
import { TrustScore } from "@/components/ui/trust-score";
import { Stars } from "@/components/ui/stars";
import { ShareButton } from "@/components/share-button";
import { UnlockPanel } from "@/components/profile/unlock-panel";
import { Reveal } from "@/components/reveal";

export function generateStaticParams() {
  return specialists.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getSpecialist(slug);
  if (!s) return { title: "Анкета не найдена" };
  return {
    title: `${s.name} — ${categories[s.category].label.toLowerCase()}, ${s.district} район`,
    description: `${categories[s.category].label} в Ташкенте: опыт ${s.experienceYears} лет, индекс доверия ${s.trustScore}, ${formatPrice(s)}.`,
  };
}

export default async function SpecialistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getSpecialist(slug);
  if (!s) notFound();

  const facts: { label: string; value: string }[] = [
    { label: "Образование", value: s.education },
    { label: "Языки", value: s.languages.join(", ") },
    { label: "Опыт работы", value: `${s.experienceYears} лет` },
  ];
  if (s.english !== "Нет") {
    facts.push({ label: "Английский язык", value: s.english });
  }

  const similar = similarSpecialists(s);

  return (
    <main className="flex-1 pb-24 lg:pb-0">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        {/* P1 — назад в каталог */}
        <Link
          href="/catalog"
          className="label-caps mt-8 inline-flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Каталог
        </Link>

        <div className="mt-6 grid gap-12 pb-20 lg:grid-cols-[1fr_380px] lg:gap-16 lg:pb-28">
          <div>
            {/* P2 — герой профиля */}
            <section className="grid gap-8 sm:grid-cols-[260px_1fr] sm:gap-10">
              <div className="relative mx-auto w-full max-w-[280px] sm:mx-0">
                <Image
                  src={s.photo}
                  alt={s.photoAlt}
                  placeholder="blur"
                  sizes="(max-width: 640px) 80vw, 280px"
                  className="aspect-3/4 w-full rounded-[2px] object-cover object-top"
                />
                <TrustScore
                  score={s.trustScore}
                  size="lg"
                  className="absolute -right-5 -bottom-5 shadow-[0_10px_30px_rgba(33,31,26,0.12)]"
                />
              </div>
              <div>
                <p className="flex flex-wrap gap-2">
                  <span className="label-caps inline-flex items-center border border-line bg-paper px-3 py-2 text-ink-soft">
                    {categories[s.category].label}
                  </span>
                  <span className="label-caps inline-flex items-center gap-1.5 border border-bronze/40 bg-paper px-3 py-2 text-ink">
                    <SealCheck size={13} className="text-bronze" aria-hidden="true" />
                    {s.verification === "premium" ? "Премиум-проверка" : "Проверен"}
                  </span>
                </p>
                <h1 className="mt-5 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink sm:text-5xl">
                  {s.name}, {s.age}
                </h1>
                <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-ink-soft">
                  <MapPin size={15} className="text-bronze" aria-hidden="true" />
                  {s.district} район
                  <span aria-hidden="true" className="text-ink-faint">
                    ·
                  </span>
                  Опыт: {s.experienceYears} лет
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-ink-soft">
                  <Stars rating={s.rating} />
                  {s.rating}
                  <a
                    href="#reviews"
                    className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
                  >
                    {s.reviews.length}{" "}
                    {s.reviews.length === 1
                      ? "отзыв"
                      : s.reviews.length < 5
                        ? "отзыва"
                        : "отзывов"}
                  </a>
                </p>
                <p className="mt-6 font-display text-2xl font-medium text-ink">
                  {formatPrice(s)}
                </p>
                <div className="mt-5">
                  <ShareButton />
                </div>
              </div>
            </section>

            {/* P4 — о специалисте */}
            <section className="mt-16 border-t border-line pt-12">
              <h2 className="font-display text-3xl font-medium text-ink">
                О специалисте
              </h2>
              <div className="mt-6 max-w-2xl space-y-4">
                {s.about.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-relaxed text-ink-soft">
                    {paragraph}
                  </p>
                ))}
              </div>
              <dl className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-l border-bronze/40 pl-5">
                    <dt className="label-caps text-ink-faint">{fact.label}</dt>
                    <dd className="mt-1.5 text-base text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              {s.attributes.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-2">
                  {s.attributes.map((attr) => (
                    <li
                      key={attr}
                      className="border border-line bg-cream-deep px-4 py-2 text-sm text-ink"
                    >
                      {attr}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* P5 «Видео-визитка» скрыта до готовности функции (D13) */}

            {/* P6 — отзывы (D14: только отображение) */}
            <section id="reviews" className="mt-16 scroll-mt-24 border-t border-line pt-12">
              <h2 className="font-display text-3xl font-medium text-ink">
                Отзывы ({s.reviews.length})
              </h2>
              {s.reviews.length > 0 ? (
                <ul className="mt-8 grid gap-6 lg:grid-cols-2">
                  {s.reviews.map((review) => (
                    <li
                      key={review.text}
                      className="flex flex-col border border-line bg-paper p-7"
                    >
                      <Stars rating={review.rating} />
                      <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                        {review.text}
                      </p>
                      <p className="mt-5 text-sm font-semibold text-ink">
                        {review.author}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-base text-ink-soft">Пока нет отзывов</p>
              )}
            </section>
          </div>

          {/* P3 + §10 — панель контактов и оплата (состояния: гость / вход / открыто) */}
          <UnlockPanel
            s={{
              slug: s.slug,
              name: s.name,
              age: s.age,
              categoryLabel: categories[s.category].label,
              trustScore: s.trustScore,
              priceLabel: formatPrice(s),
              fee: UNLOCK_FEE_UZS,
              photo: s.photo,
              photoAlt: s.photoAlt,
            }}
          />
        </div>
      </div>

      {/* P7 — похожие специалисты (D15) */}
      {similar.length > 0 && (
        <section className="bg-cream-deep/60 py-20 lg:py-24">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
            <Reveal>
              <h2 className="font-display text-3xl font-medium text-ink sm:text-4xl">
                Похожие специалисты
              </h2>
            </Reveal>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {similar.map((sp, i) => (
                <li key={sp.slug}>
                  <Reveal delay={i * 0.08}>
                    <SpecialistCard specialist={sp} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

    </main>
  );
}
