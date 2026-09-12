import type { Gender } from "@/lib/specialists-shared";

/**
 * Аватар-заглушка для анкеты без фотографии (решение владельца, 2026-09-11).
 *
 * Рисуется по полу — семья с первого взгляда понимает, кто перед ней, даже
 * если фото ещё не загружено. Ничего «фотореалистичного» здесь нет намеренно:
 * заглушка не должна выдавать себя за настоящий снимок. Графика встроена в
 * компонент, а не лежит файлом: цвета берутся из токенов темы, поэтому
 * аватар остаётся в палитре сайта, где бы его ни показали.
 *
 * Контракт как у next/image с `fill`: родитель — `relative` с размерами и
 * `overflow-hidden`; SVG растягивается на всю площадь и обрезается по центру
 * (`slice`), так что одна картинка годится и для 4:5 карточки, и для 3:4
 * страницы, и для квадрата в кабинете. Без пола (анкеты до появления поля)
 * остаётся прежняя монограмма с инициалами.
 */
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
    <svg
      {...common}
      role="img"
      aria-label={gender === "female" ? "Фотографии пока нет: женщина" : "Фотографии пока нет: мужчина"}
    >
      {gender === "female" ? <FemaleFigure /> : <MaleFigure />}
    </svg>
  );
}

/*
 * Фигуры — «бумажная аппликация»: три плоских тона и тонкая бронзовая
 * окружность за головой (эхо печати с главной). Женщина — волосы, собранные
 * в низкий пучок, мягкий вырез; мужчина — короткая стрижка и ворот рубашки.
 * Черт лица нет намеренно. Все цвета — токены темы (см. globals.css).
 * Выбрано из четырёх вариантов дизайн-панели 2026-09-12.
 */
const GROUND = "var(--color-cream-deep)";
const RING = "var(--color-bronze)";
const HAIR = "var(--color-ink)";
const BODY = "var(--color-ink-soft)";
const SKIN = "var(--color-paper)";

function FemaleFigure() {
  return (
    <>
      <rect width="400" height="500" fill={GROUND} />
      <circle cx="200" cy="236" r="158" fill="none" stroke={RING} strokeWidth="1.25" />
      <path
        fill={HAIR}
        d="M200 118C248 118 276 156 276 208C276 230 274 246 268 260C272 268 288 282 288 298C288 318 272 328 254 326C236 324 224 314 218 298V280L200 290L172 282C158 276 148 266 140 254C130 240 126 226 126 208C126 156 152 118 200 118Z"
      />
      <path fill={SKIN} d="M180 262H220V346C248 350 270 366 270 406H130C130 366 152 350 180 346Z" />
      <path
        fill={BODY}
        d="M30 500V446C30 404 92 376 154 352C172 346 182 384 200 384C218 384 228 346 246 352C308 376 370 404 370 446V500Z"
      />
      <ellipse cx="200" cy="220" rx="57" ry="76" fill={SKIN} />
      <path
        fill={HAIR}
        d="M136 232C126 160 152 118 200 118C248 118 276 160 262 226C248 190 222 176 198 178C172 180 150 198 136 232Z"
      />
    </>
  );
}

function MaleFigure() {
  return (
    <>
      <rect width="400" height="500" fill={GROUND} />
      <circle cx="200" cy="236" r="158" fill="none" stroke={RING} strokeWidth="1.25" />
      <path fill={SKIN} d="M170 270H230V384H170Z" />
      <path
        fill={BODY}
        d="M10 500V418C10 386 70 370 150 352C153 338 158 328 165 320C167 318 169 318 170 320C180 342 190 364 200 386C210 364 220 342 230 320C231 318 233 318 235 320C242 328 247 338 250 352C330 370 390 386 390 418V500Z"
      />
      <path
        fill={SKIN}
        d="M200 140C236 140 262 168 262 212L258 268C256 284 244 296 226 303C214 307 186 307 174 303C156 296 144 284 142 268L138 212C138 168 164 140 200 140Z"
      />
      <path
        fill={HAIR}
        d="M144 236C138 226 136 218 136 210C136 160 166 134 200 134C234 134 264 160 264 210C264 218 262 226 256 236L250 208C246 194 230 178 200 178C170 178 154 194 150 208Z"
      />
    </>
  );
}
