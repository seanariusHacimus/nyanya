import Image from "next/image";
import Link from "next/link";
import { MapPin, SealCheck } from "@phosphor-icons/react/dist/ssr";
import {
  categories,
  formatPrice,
  type UiSpecialist,
} from "@/lib/specialists-shared";
import { TrustScore } from "@/components/ui/trust-score";
import { Stars } from "@/components/ui/stars";
import { FavoriteHeart } from "@/components/favorite-heart";

/** Монограмма — премиальный fallback для анкет без фото (§4.5). */
function Monogram({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-cream-deep">
      <span className="flex size-24 items-center justify-center rounded-full border border-bronze/50 font-display text-3xl font-medium text-bronze-text">
        {initials}
      </span>
    </div>
  );
}

/** Карточка специалиста — §4.5. Данные приходят из PostgreSQL. */
export function SpecialistCard({
  specialist,
  favorite = false,
  authed = false,
}: {
  specialist: UiSpecialist;
  favorite?: boolean;
  authed?: boolean;
}) {
  const s = specialist;
  return (
    <article className="group relative flex h-full flex-col border border-line bg-paper transition-colors duration-300 hover:border-ink-faint">
      <div className="relative aspect-4/5 overflow-hidden bg-cream-deep">
        {s.photoUrl ? (
          <Image
            src={s.photoUrl}
            alt={`${s.name} — ${categories[s.category].label.toLowerCase()}, портрет`}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 30vw"
            className="object-cover object-top transition-transform duration-700 ease-out-quart group-hover:scale-[1.03]"
          />
        ) : (
          <Monogram name={s.name} />
        )}
        <span className="label-caps absolute top-4 left-4 inline-flex items-center gap-1.5 bg-cream/95 px-3 py-2 text-ink">
          <SealCheck size={13} className="text-bronze" aria-hidden="true" />
          {s.verification === "premium" ? "Премиум-проверен" : "Опубликована"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl leading-snug font-medium text-ink">
              <Link
                href={`/specialists/${s.slug}`}
                className="after:absolute after:inset-0"
              >
                {s.name}
                {s.age !== null && `, ${s.age}`}
              </Link>
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
              {categories[s.category].label}
              <span aria-hidden="true" className="text-ink-faint">
                ·
              </span>
              <MapPin size={13} className="text-bronze" aria-hidden="true" />
              {s.district} район
            </p>
          </div>
          <TrustScore score={s.trustScore} size="sm" className="shrink-0" />
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          Опыт: {s.experienceYears} лет
          <span aria-hidden="true" className="text-ink-faint">
            ·
          </span>
          <Stars rating={s.rating} />
          <span>
            {s.rating.toFixed(1)} ({s.reviewCount})
          </span>
        </p>

        <p className="mt-auto pt-5 text-base font-semibold text-ink">
          {formatPrice(s)}
        </p>
      </div>

      <FavoriteHeart
        slug={s.slug}
        name={s.name}
        initialActive={favorite}
        authed={authed}
        className="absolute top-4 right-4 z-10"
      />
    </article>
  );
}
