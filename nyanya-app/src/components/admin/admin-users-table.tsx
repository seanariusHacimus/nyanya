"use client";

import Form from "next/form";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { AdminUserRow, Page } from "@/lib/queries/admin";
import { setUserBlocked } from "@/lib/actions/admin";
import {
  AdminError,
  ROLE_LABEL,
  actionButton,
  dangerButton,
  formatDate,
} from "@/components/admin/admin-ui";
import { Pager, rangeText } from "@/components/admin/pager";
import { useAdminAction } from "@/components/admin/use-admin-action";

/**
 * Поиск людей. Запрос уходит на сервер по `?q=`, а не фильтрует загруженные
 * строки в браузере: раньше сюда приходили двести самых старых аккаунтов, и
 * после двухсотой регистрации новых было не найти.
 *
 * `Form` со строковым `action` — обычная GET-форма, но с клиентской
 * навигацией: Enter или «Найти» ведёт на /admin/users?q=…, а `page` в форме
 * не участвует, поэтому новый поиск сам начинается с первой страницы.
 */
export function AdminUsersTable({
  result,
  q,
  currentUserId,
}: {
  result: Page<AdminUserRow>;
  q: string;
  currentUserId: string;
}) {
  const { run, pending, busyId, error } = useAdminAction();
  const shown = rangeText(result.page, result.pageSize, result.rows.length, result.total);

  return (
    <div>
      <h1 className="font-display text-3xl leading-[1.08] font-medium text-ink sm:text-4xl">
        Пользователи
      </h1>

      <AdminError error={error} />

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-medium text-ink">
            Пользователи
          </h2>
          <p className="text-sm text-ink-soft">
            {result.total === 0 ? "Никого не найдено" : shown}
          </p>
        </div>

        <Form
          action="/admin/users"
          className="mt-6 flex items-center gap-3 border border-line bg-paper px-4 sm:max-w-xl"
        >
          <MagnifyingGlass size={16} className="text-ink-faint" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Поиск по имени или почте"
            aria-label="Поиск людей по имени или почте"
            className="min-h-11 w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button type="submit" className={actionButton}>
            Найти
          </button>
        </Form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Имя", "Роль", "Email", "Регистрация", "Действия"].map((h) => (
                  <th
                    key={h}
                    className="label-caps py-3 pr-6 font-medium text-ink-faint"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((u) => {
                const busy = busyId === u.id || pending;
                const isSelf = u.id === currentUserId;
                const isAdmin = u.role === "admin";
                return (
                  <tr key={u.id} className="border-b border-line/60 align-top">
                    <td
                      className={`py-4 pr-6 font-medium ${
                        u.banned ? "text-ink-faint line-through" : "text-ink"
                      }`}
                    >
                      {u.name}
                      {u.flaggedAt && (
                        <span className="mt-1 block text-xs font-normal text-[#a5462f] no-underline">
                          лимит контактов · {formatDate(u.flaggedAt)}
                        </span>
                      )}
                      {u.banned && u.banReason && (
                        <span className="mt-1 block text-xs font-normal text-[#a5462f] no-underline">
                          {u.banReason}
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-6 text-ink-soft">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </td>
                    <td className="py-4 pr-6 text-ink-soft">{u.email}</td>
                    <td className="py-4 pr-6 text-ink-soft">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-4">
                      {isAdmin ? (
                        <span className="text-xs text-ink-faint">
                          {isSelf ? "это вы" : "администратор"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(
                              u.id,
                              () =>
                                setUserBlocked({
                                  userId: u.id,
                                  blocked: !u.banned,
                                }),
                              u.banned
                                ? `${u.name} разблокирован`
                                : `${u.name} заблокирован`
                            )
                          }
                          className={u.banned ? actionButton : dangerButton}
                        >
                          {u.banned ? "Разблокировать" : "Заблокировать"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {result.rows.length === 0 && (
            <p className="border-b border-line/60 py-8 text-sm text-ink-soft">
              {result.total === 0
                ? "Никого не найдено."
                : "На этой странице пусто — вернитесь к началу списка."}
            </p>
          )}
        </div>

        <Pager
          pathname="/admin/users"
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          params={q ? { q } : undefined}
        />

        <p className="mt-4 text-xs text-ink-soft">
          Блокировка закрывает вход и завершает активные сессии. Анкета
          заблокированного специалиста скрывается из каталога.
        </p>
      </section>
    </div>
  );
}
