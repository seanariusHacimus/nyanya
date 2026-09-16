import Link from "next/link";
import { actionButton } from "@/components/admin/admin-ui";

/**
 * Листание списков админки. Страница живёт в адресе (`?page=`), поэтому
 * ссылку можно переслать, а «назад» в браузере возвращает предыдущую.
 *
 * `params` — только непустые параметры раздела (`q`, `status`), чтобы адрес
 * не обрастал пустыми `?q=`. На первой странице `page` не пишется вовсе: у
 * начала списка один адрес, а не два.
 */
export function Pager({
  pathname,
  page,
  pageSize,
  total,
  params,
}: {
  pathname: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string>;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const href = (n: number) => ({
    pathname,
    query: { ...params, ...(n > 1 ? { page: String(n) } : {}) },
  });

  // пустой результат объясняет сам список («Никого не найдено», «Ничего не
  // найдено», «Очередь пуста») — листать там нечего
  if (total === 0) return null;

  if (page > last) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6 text-sm text-ink-soft">
        {/* «на этой странице пусто» уже сказал список — здесь только сколько
            страниц есть и ссылка назад, чтобы не повторять одно дважды */}
        <span>Всего страниц: {last}.</span>
        <Link href={href(1)} className={`${actionButton} inline-flex items-center`}>
          В начало списка
        </Link>
      </div>
    );
  }

  if (last === 1) return null;

  return (
    <nav
      aria-label="Страницы списка"
      className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${actionButton} inline-flex items-center`}>
          ← Назад
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-ink-soft">
        Страница {page} из {last}
      </span>
      {page < last ? (
        <Link href={href(page + 1)} className={`${actionButton} inline-flex items-center`}>
          Вперёд →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** «Показано 1–50 из 320» — одинаково во всех списках. */
export function rangeText(page: number, pageSize: number, shown: number, total: number) {
  if (total === 0 || shown === 0) return null;
  const from = (page - 1) * pageSize + 1;
  return `Показано ${from}–${from + shown - 1} из ${total}`;
}
