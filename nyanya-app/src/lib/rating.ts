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
 *
 * Сначала строка анкеты блокируется отдельным запросом, и только потом
 * считается среднее. В одном `UPDATE … FROM (select avg …)` снимок для
 * среднего берётся до ожидания блокировки: если модератор публикует или
 * скрывает один отзыв анкеты, пока автор другого сохраняет правку, второй
 * `UPDATE` дожидается первого и записывает среднее, не видя его решения
 * (проверено локально 2026-09-16: 0 опубликованных отзывов, а в анкете
 * 5.00 и 1 отзыв). В READ COMMITTED следующий запрос берёт новый снимок —
 * уже после блокировки. `FOR NO KEY UPDATE`, а не `FOR UPDATE`: не мешает
 * вставкам со ссылкой на анкету (открытия контактов, новые отзывы).
 */
export async function recalcRating(
  exec: DbExecutor,
  profileId: string
): Promise<void> {
  await exec.execute(
    sql`select 1 from specialist_profiles where id = ${profileId} for no key update`
  );
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
