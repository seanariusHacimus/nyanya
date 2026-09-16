import type { ProfileFilter } from "@/lib/queries/admin";

/**
 * Разбор адреса для списков админки. Состояние списка (страница, поиск,
 * фильтр) живёт в `?page=`, `?q=`, `?status=`, а не в памяти браузера: ссылку
 * можно переслать, страницу — обновить, а `router.refresh()` после решения
 * модератора возвращает тот же экран, а не начало списка.
 *
 * Значения приходят из адреса, то есть от кого угодно, поэтому каждое
 * приводится к допустимому: страница — целое от 1 до 10 000, запрос — не
 * длиннее 100 символов, статус — из перечня, иначе «все».
 */

type Raw = string | string[] | undefined;

/** Повторённый параметр (`?page=2&page=9`) — берём первый. */
function first(value: Raw): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parsePage(value: Raw): number {
  const n = Number.parseInt(first(value), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 10_000);
}

export function parseQuery(value: Raw): string {
  return first(value).trim().slice(0, 100);
}

const PROFILE_FILTERS: ProfileFilter[] = [
  "all",
  "waiting",
  "pending_review",
  "draft",
  "active",
  "hidden",
  "rejected",
];

export function parseStatus(value: Raw): ProfileFilter {
  const raw = first(value);
  return PROFILE_FILTERS.find((f) => f === raw) ?? "all";
}
