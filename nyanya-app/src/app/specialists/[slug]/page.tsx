import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getSpecialistBySlug,
  getSimilarSpecialists,
  getUnlockedContactsForUser,
  categories,
  formatPrice,
} from "@/lib/queries/specialists";
import { getFavoriteSlugs } from "@/lib/queries/account";
import { SpecialistCard } from "@/components/specialist-card";
import { TrustScore } from "@/components/ui/trust-score";
import { Stars } from "@/components/ui/stars";
import { ShareButton } from "@/components/share-button";
import { UnlockPanel } from "@/components/profile/unlock-panel";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic"; // анкета читается из PostgreSQL

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = await getSpecialistBySlug(slug);
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
  const s = await getSpecialistBySlug(slug);
  if (!s) notFound();

  const facts: { label: string; value: string }[] = [];
  if (s.education) facts.push({ label: "Образование", value: s.education });
  if (s.languages.length > 0)
    facts.push({ label: "Языки", value: s.languages.join(", ") });
  facts.push({ label: "Опыт работы", value: `${s.experienceYears} лет` });
  if (s.english !== "Нет")
    facts.push({ label: "Английский язык", value: s.english });

  const similar = await getSimilarSpecialists(s.slug, s.category);

  // состояние доступа к контактам — на сервере, до первого рендера
  const session = await auth.api.getSession({ headers: await headers() });
  const [initialContacts, favoriteSlugs] = session
    ? await Promise.all([
        getUnlockedContactsForUser(s.slug, session.user.id),
        getFavoriteSlugs(session.user.id),
      ])
    : [null, [] as string[]];

  return (
    <main className="flex-1 pb-24 lg:pb-0">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
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
                <div className="relative aspect-3/4 w-full overflow-hidden rounded-[2px] bg-cream-deep">
                  {s.photoUrl ? (
                    <Image
                      src={s.photoUrl}
                      alt={`${s.name} — портрет`}
                      fill
                      sizes="(max-width: 640px) 80vw, 280px"
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <span className="flex size-24 items-center justify-center rounded-full border border-bronze/50 font-display text-3xl font-medium text-bronze-text">
                        {s.name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")}
                      </span>
                    </div>
                  )}
                </div>
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
                    {s.verification === "premium" ? "Премиум-проверен" : "Проверена"}
                  </span>
                </p>
                <h1 className="mt-5 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink sm:text-5xl">
                  {s.name}
                  {s.age !== null && `, ${s.age}`}
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
                  {s.rating.toFixed(1)}
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
                О себе
              </h2>
              <div className="mt-6 max-w-2xl space-y-4">
                {s.about.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-base leading-relaxed text-ink-soft"
                  >
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

            {/* P6 — отзывы (D14: только отображение) */}
            <section
              id="reviews"
              className="mt-16 scroll-mt-24 border-t border-line pt-12"
            >
              <h2 className="font-display text-3xl font-medium text-ink">
                Отзывы ({s.reviews.length})
              </h2>
              {s.reviews.length > 0 ? (
                <ul className="mt-8 grid gap-6 lg:grid-cols-2">
                  {s.reviews.map((review) => (
                    <li
                      key={review.text.slice(0, 40)}
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

          {/* P3 + §10 — панель контактов */}
          <UnlockPanel
            s={{
              slug: s.slug,
              name: s.name,
              age: s.age,
              categoryLabel: categories[s.category].label,
              trustScore: s.trustScore,
              priceLabel: formatPrice(s),
              photoUrl: s.photoUrl,
            }}
            initialAuthed={Boolean(session)}
            initialContacts={initialContacts}
            initialFavorite={favoriteSlugs.includes(s.slug)}
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
