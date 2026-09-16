import { revalidatePath, updateTag } from "next/cache";

/**
 * Тег кэша каталога и единственный способ его сбросить.
 *
 * Выдача каталога и счётчик анкет закэшированы на 60 секунд
 * (`unstable_cache` в `lib/queries/specialists.ts`), поэтому каждое серверное
 * действие, меняющее состояние анкет, обязано сбросить тег — иначе модератор
 * нажимает «Опубликовать», а семья ещё минуту видит прежний список.
 *
 * `updateTag`, а не `revalidateTag(tag, "max")`: истёкший тег должен означать
 * промах кэша и свежий запрос в том же следующем обращении, а не отдачу
 * устаревшего списка, пока фоном считается новый.
 *
 * ВАЖНО: `updateTag` разрешён ТОЛЬКО внутри серверного действия — из
 * route handler (`/api/*`) он бросает исключение. Если такой вызов
 * понадобится в маршруте, там нужен `revalidateTag(CATALOG_TAG, { expire: 0 })`.
 */
export const CATALOG_TAG = "catalog";

/** Страницы и кэш, которые зависят от состояния анкет. */
export function revalidateCatalog(slug?: string | null) {
  revalidatePath("/catalog");
  updateTag(CATALOG_TAG);
  if (slug) revalidatePath(`/specialists/${slug}`);
}
