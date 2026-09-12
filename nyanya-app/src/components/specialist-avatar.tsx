import Image from "next/image";
import type { Gender } from "@/lib/specialists-shared";

/**
 * Аватар-заглушка для анкеты без фотографии (решение владельца, 2026-09-11).
 *
 * Рисуется по полу — семья с первого взгляда понимает, кто перед ней, даже
 * если фото ещё не загружено. Картинки сгенерированы (Higgsfield, gpt_image_2,
 * 2026-09-12) как стилизованные иллюстрации в палитре сайта — намеренно не
 * фотореалистичные, чтобы заглушка не выдавала себя за настоящий снимок.
 * Файлы лежат в public/images и уже оптимизированы скриптом
 * scripts/optimize-avatar.mjs (960×1200 WebP, качество 88); отдаются как есть
 * (`unoptimized`), чтобы оптимизатор Next не пережимал их до мыла.
 *
 * Контракт как у next/image с `fill`: родитель — `relative` с размерами и
 * `overflow-hidden`; картинка обрезается по верху (`object-top`), так что один
 * файл годится и для 4:5 карточки, и для 3:4 страницы, и для квадрата в
 * кабинете. Без пола (анкеты до появления поля) остаётся монограмма с
 * инициалами.
 */
const AVATAR_SRC: Record<Gender, string> = {
  female: "/images/avatar-female.webp",
  male: "/images/avatar-male.webp",
};
export function SpecialistAvatar({
  gender,
  name,
}: {
  gender: Gender | null;
  name: string;
}) {
  const common = {
    viewBox: "0 0 400 500",
    preserveAspectRatio: "xMidYMid slice" as const,
    className: "absolute inset-0 size-full",
  };
  if (!gender) {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase();
    return (
      <svg {...common} role="img" aria-label="Фотографии пока нет">
        <rect width="400" height="500" fill="var(--color-cream-deep)" />
        <circle cx="200" cy="250" r="96" fill="none" stroke="var(--color-bronze)" strokeOpacity="0.5" strokeWidth="2" />
        <text
          x="200"
          y="250"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-display"
          fontSize="88"
          fontWeight="500"
          fill="var(--color-bronze-text)"
        >
          {initials}
        </text>
      </svg>
    );
  }
  return (
    <Image
      src={AVATAR_SRC[gender]}
      alt={gender === "female" ? "Фотографии пока нет: женщина" : "Фотографии пока нет: мужчина"}
      fill
      unoptimized
      className="object-cover object-top"
    />
  );
}
