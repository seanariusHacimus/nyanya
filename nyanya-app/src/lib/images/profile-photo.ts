import path from "node:path";

export { PHOTO_MIME, isPhotoMime } from "@/lib/storage/limits";

/**
 * Подготовка файла к записи в хранилище.
 *
 * Тут решается ровно одно: **фотография анкеты сжимается, документы — нет**.
 *
 * Фотография публична (после одобрения модератором), показывается в каталоге
 * и в карточках, и приходит прямо с телефона: 3–8 МБ, 4000 px по длинной
 * стороне, с EXIF, где у снимков с телефона лежат и координаты съёмки. Поэтому
 * фотография приводится к одному виду: поворот по EXIF запекается в пиксели,
 * длинная сторона — не больше 1600 px, кодирование в WebP q85, метаданные
 * отброшены (sharp не переносит их без `withMetadata()`).
 *
 * Паспорт, справки и рекомендательные письма не трогаются **побайтово**: это
 * документы, модератор смотрит подлинный файл, а не его пересжатую копию.
 *
 * 1600 px — с запасом под экраны 3x на странице анкеты (280 px × 3 = 840) и
 * планшеты (46vw × 2 ≈ 900); 1200 px давал бы меньше байт, но не оставлял
 * запаса.
 */

export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_WEBP_QUALITY = 85;

export type UploadPayload = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

export type PreparedUpload =
  | { ok: true; payload: UploadPayload }
  | { ok: false; error: "photo_unreadable" };

/**
 * sharp подключается лениво и через `import()`, а не статически.
 *
 * Причина практическая: пакет тянет платформенный бинарник, и если его на
 * машине не окажется, статический импорт уронил бы весь модуль серверного
 * действия — специалист вместо загрузки получил бы аварийную страницу.
 * Лениво же неудача видна в логе (`[photo] sharp недоступен`), а фотография
 * сохраняется как есть — большой, но целой. Это единственный случай, когда мы
 * кладём в хранилище неуменьшенный снимок.
 */
type SharpModule = typeof import("sharp");
let sharpPromise: Promise<SharpModule> | null = null;

async function loadSharp(): Promise<SharpModule["default"] | null> {
  try {
    sharpPromise ??= import("sharp");
    return (await sharpPromise).default;
  } catch (error) {
    // повторная попытка на следующей загрузке: кэшировать отказ незачем
    sharpPromise = null;
    console.error("[photo] sharp недоступен — фотография сохранена как есть", {
      error: String(error),
    });
    return null;
  }
}

export type NormalizedPhoto = {
  buffer: Buffer;
  width: number;
  height: number;
};

/**
 * Уменьшает и перекодирует снимок. `null` — sharp недоступен (файл нужно
 * сохранить как есть); исключение — файл не удалось прочитать как изображение.
 */
export async function normalizeProfilePhoto(
  input: Buffer
): Promise<NormalizedPhoto | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;

  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate() // поворот по EXIF запекается в пиксели
    .resize({
      width: PHOTO_MAX_SIDE,
      height: PHOTO_MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    // effort 6 медленнее примерно на треть ради 4 % байтов — процесс один и
    // он же отдаёт страницы
    .webp({ quality: PHOTO_WEBP_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
}

/**
 * Что класть в хранилище: фотография — уменьшенная, всё остальное — как
 * пришло. Оба действия загрузки (кабинет специалиста и админ-панель) зовут
 * эту функцию одинаково.
 *
 * Нечитаемый снимок — отказ, а не «сохраним как есть»: битый файл в анкете
 * молча превратился бы в сломанную картинку в каталоге, и специалист узнал бы
 * об этом последним.
 */
export async function prepareDocumentUpload({
  stepKey,
  fileName,
  mimeType,
  buffer,
}: {
  stepKey: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<PreparedUpload> {
  if (stepKey !== "profile_photo") {
    return { ok: true, payload: { buffer, mimeType, fileName } };
  }

  let photo: NormalizedPhoto | null;
  try {
    photo = await normalizeProfilePhoto(buffer);
  } catch (error) {
    console.warn("[photo] изображение не прочитано", { error: String(error) });
    return { ok: false, error: "photo_unreadable" };
  }

  if (!photo) return { ok: true, payload: { buffer, mimeType, fileName } };

  return {
    ok: true,
    payload: {
      buffer: photo.buffer,
      mimeType: "image/webp",
      // расширение ключа storage берёт из имени файла (`extensionFor`), и без
      // `.webp` байты WebP легли бы под ключом `.jpg`
      fileName: `${path.parse(fileName).name || "photo"}.webp`,
    },
  };
}
