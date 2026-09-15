import { sql } from "drizzle-orm";
import type { DbExecutor } from "@/db";

/**
 * Пересчёт `rating_avg` и `review_count` анкеты — только по опубликованным
 * (`visible`) отзывам: отзыв на проверке или скрытый модератором не должен
 * двигать средний балл, который видят семьи и по которому сортируется каталог.
 *
 * Вызывается в той же транзакции, что и запись отзыва или решение модератора,
 * — так число в анкете никогда не расходится с таблицей отзывов. Раньше
 * функция жила в файле с "use server" и была публичным сетевым endpoint'ом.
 *
 * Строка анкеты обновляется, только если числа изменились: `updated_at` уходит
 * в `lastModified` карты сайта, а новый отзыв на проверке анкету для семей не
 * меняет. Округление — как в миграции 0012 и `scripts/delete-accounts.mjs`.
 */
export async function recalcRating(
  exec: DbExecutor,
  profileId: string
): Promise<void> {
  await exec.execute(sql`
    update specialist_profiles p
    set rating_avg = a.avg_rating, review_count = a.n, updated_at = now()
    from (
      select coalesce(round(avg(rating)::numeric, 2), 0) as avg_rating, count(*)::int as n
      from reviews
      where specialist_id = ${profileId} and status = 'visible'
    ) a
    where p.id = ${profileId}
      and (p.rating_avg is distinct from a.avg_rating or p.review_count is distinct from a.n)
  `);
}
