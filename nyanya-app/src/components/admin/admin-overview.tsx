"use client";

import Link from "next/link";
import {
  Users,
  IdentificationBadge,
  LockKeyOpen,
  ClipboardText,
  FileMagnifyingGlass,
  Percent,
  ChatCircleText,
} from "@phosphor-icons/react";
import type {
  AdminFlaggedRow,
  AdminProfileRow,
  AdminStats,
} from "@/lib/queries/admin";
import { categories, pluralRu } from "@/lib/specialists-shared";
import { clearUserFlag, setUserBlocked } from "@/lib/actions/admin";
import {
  AdminError,
  ROLE_LABEL,
  actionButton,
  dangerButton,
  formatDate,
  formatDateTime,
} from "@/components/admin/admin-ui";
import { useAdminAction } from "@/components/admin/use-admin-action";

/**
 * Обзор: цифры, аккаунты с отметкой о лимите контактов и первые анкеты,
 * которых нет в каталоге. Полный список ждущих решения — на /admin/profiles,
 * сюда он не помещается и не должен: обзор открывают, чтобы за секунду
 * понять, есть ли работа.
 */
export function AdminOverview({
  stats,
  flagged,
  unlockDailyCap,
  queue,
  currentUserId,
}: {
  stats: AdminStats;
  flagged: AdminFlaggedRow[];
  unlockDailyCap: number;
  queue: { rows: AdminProfileRow[]; total: number };
  currentUserId: string;
}) {
  const { run, pending, busyId, error } = useAdminAction();

  const tiles = [
    { icon: Users, label: "Родители", value: stats.parents },
    {
      icon: IdentificationBadge,
      label: "Специалисты",
      value: stats.specialists,
    },
    {
      icon: ClipboardText,
      label: "Анкеты на проверке",
      value: stats.pendingProfiles,
    },
    {
      icon: FileMagnifyingGlass,
      label: "Документы на проверке",
      value: stats.pendingDocuments,
    },
    {
      icon: ChatCircleText,
      label: "Отзывы на проверке",
      value: stats.pendingReviews,
    },
    { icon: LockKeyOpen, label: "Открытий контактов", value: stats.unlocks },
    { icon: Percent, label: "Конверсия", value: `${stats.conversion}%` },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl leading-[1.08] font-medium text-ink sm:text-4xl">
        Обзор
      </h1>

      <AdminError error={error} />

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((s) => (
          <div key={s.label} className="border border-line bg-paper p-5">
            <dt className="label-caps flex items-center gap-2 text-ink-faint">
              <s.icon size={14} className="text-bronze" />
              {s.label}
            </dt>
            <dd className="mt-3 font-display text-2xl font-medium text-ink">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-10" aria-labelledby="flagged-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="flagged-heading"
            className="font-display text-2xl font-medium text-ink"
          >
            Подозрительная активность
          </h2>
          {stats.flagged > flagged.length && (
            <p className="text-sm text-ink-soft">
              Показаны последние {flagged.length} из {stats.flagged}
            </p>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
          Аккаунты, которые за 24 часа открыли {unlockDailyCap}{" "}
          {pluralRu(
            unlockDailyCap,
            "новый контакт",
            "новых контакта",
            "новых контактов"
          )}{" "}
          — это суточный лимит. Сюда может попасть и семья с большим
          поиском: смотрите на дату регистрации и число открытий. Новые
          контакты аккаунт откроет, когда старые открытия выйдут из 24-часового
          окна; уже открытые остаются у него в любом случае.
        </p>
        {flagged.length === 0 ? (
          <p className="mt-5 border border-line bg-paper px-5 py-8 text-sm text-ink-soft">
            Лимит открытий контактов никто не исчерпал.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line border border-line bg-paper">
            {flagged.map((f) => {
              const busy = busyId === f.id || pending;
              const canBlock = f.role !== "admin" && f.id !== currentUserId;
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold break-all text-ink">
                      {f.email}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {ROLE_LABEL[f.role] ?? f.role}
                      {f.name ? ` · ${f.name}` : ""} · регистрация{" "}
                      {formatDate(f.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      За 24 часа: {f.unlocks24h} · всего открыто: {f.unlocksTotal}{" "}
                      · отмечен {formatDateTime(f.flaggedAt)}
                    </p>
                    {f.banned && (
                      <p className="mt-1 text-xs text-[#a5462f]">
                        пользователь заблокирован
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(
                          f.id,
                          () => clearUserFlag({ userId: f.id }),
                          `Отметка снята: ${f.email}`
                        )
                      }
                      className={actionButton}
                    >
                      Разобрано
                    </button>
                    {canBlock && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(
                            f.id,
                            () =>
                              setUserBlocked({
                                userId: f.id,
                                blocked: !f.banned,
                                reason: "Массовое открытие контактов",
                              }),
                            f.banned
                              ? `${f.email} разблокирован`
                              : `${f.email} заблокирован`
                          )
                        }
                        className={f.banned ? actionButton : dangerButton}
                      >
                        {f.banned ? "Разблокировать" : "Заблокировать"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {flagged.length > 0 && (
          <p className="mt-4 text-xs text-ink-soft">
            «Разобрано» снимает отметку — если аккаунт снова упрётся в лимит,
            он вернётся сюда. Блокировка закрывает вход, завершает активные
            сессии и скрывает анкету специалиста из каталога.
          </p>
        )}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-medium text-ink">
            Не в каталоге
          </h2>
          {queue.total > queue.rows.length && (
            <p className="text-sm text-ink-soft">
              Показаны первые {queue.rows.length} из {queue.total}
            </p>
          )}
        </div>
        {queue.rows.length === 0 ? (
          <p className="mt-5 border border-line bg-paper px-5 py-8 text-sm text-ink-soft">
            Все анкеты опубликованы — разбирать нечего.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line border border-line bg-paper">
            {queue.rows.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">{p.fullName}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {categories[p.category].label} · {p.email}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {
                      {
                        draft: "Черновик — проверьте анкету и опубликуйте",
                        pending_review: "Специалист отправил на проверку",
                        rejected: "Отклонена — специалист исправляет",
                        hidden: "Снята с публикации",
                        active: "",
                      }[p.status]
                    }
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <span className="label-caps text-ink-faint">
                    {p.photoPending
                      ? "фото ждёт проверки"
                      : `до премиума: ${p.approvedDocuments}/${p.requiredDocuments}`}
                  </span>
                  <Link
                    href={`/admin/profiles/${p.id}`}
                    className="label-caps border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
                  >
                    Разобрать
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {queue.total > 0 && (
          <p className="mt-4 text-sm">
            <Link
              href={{ pathname: "/admin/profiles", query: { status: "waiting" } }}
              className="border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
            >
              Все, кто ждёт решения →
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
