import Image from "next/image";
import Link from "next/link";
import { MapPin, SealCheck, Heart } from "@phosphor-icons/react/dist/ssr";
import {
  categories,
  formatPrice,
  type Specialist,
} from "@/content/specialists";
import { TrustScore } from "@/components/ui/trust-score";
import { Stars } from "@/components/ui/stars";

/** Карточка специалиста — §4.5. Вся карточка ведёт в профиль; ♡ — гостя на /login (D11). */
export function SpecialistCard({ specialist }: { specialist: Specialist }) {
  const s = specialist;
  return (
    <article className="group relative flex h-full flex-col border border-line bg-paper transition-colors duration-300 hover:border-ink-faint">
      <div className="relative aspect-4/5 overflow-hidden bg-cream-deep">
        <Image
          src={s.photo}
          alt={s.photoAlt}
          placeholder="blur"
          sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 30vw"
          className="absolute inset-0 size-full object-cover object-top transition-transform duration-700 ease-out-quart group-hover:scale-[1.03]"
        />
        <span className="label-caps absolute top-4 left-4 inline-flex items-center gap-1.5 bg-cream/95 px-3 py-2 text-ink">
          <SealCheck size={13} className="text-bronze" aria-hidden="true" />
          {s.verification === "premium" ? "Премиум-проверка" : "Проверен"}
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
                {s.name}, {s.age}
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
            {s.rating} ({s.reviews.length})
          </span>
        </p>

        <p className="mt-auto pt-5 text-base font-semibold text-ink">
          {formatPrice(s)}
        </p>
      </div>

      {/* D11: ♡ на карточке; гость → вход. z-10 поверх stretched-link */}
      <Link
        href="/login"
        aria-label={`Добавить ${s.name} в избранное (нужен вход)`}
        className="absolute top-4 right-4 z-10 flex size-11 items-center justify-center rounded-full bg-cream/95 text-ink transition-colors duration-300 hover:text-bronze-text"
      >
        <Heart size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
