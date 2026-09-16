"use client";

import { useState } from "react";
import Link from "next/link";
import Form from "next/form";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import type {
  AdminProfileRow,
  Page,
  ProfileFilter,
  ProfileTotals,
} from "@/lib/queries/admin";
import { categories } from "@/lib/specialists-shared";
import { VERIFICATION_LABEL } from "@/lib/verification";
import { moderateProfile } from "@/lib/actions/admin";
import { RejectionForm } from "@/components/admin/rejection-form";
import {
  AdminError,
  STATUS_LABEL,
  actionButton,
  dangerButton,
} from "@/components/admin/admin-ui";
import { Pager, rangeText } from "@/components/admin/pager";
import { useAdminAction } from "@/components/admin/use-admin-action";

const FILTERS: { key: ProfileFilter; label: string }[] = [
  { key: "waiting", label: "Ждут решения" },
  { key: "all", label: "Все" },
  { key: "pending_review", label: "На проверке" },
  { key: "draft", label: "Черновики" },
  { key: "active", label: "Опубликованы" },
  { key: "hidden", label: "Скрыты" },
  { key: "rejected", label: "Отклонены" },
];

/**
 * Список анкет. Фильтр, поиск и страница живут в адресе, поэтому после
 * решения модератора (`router.refresh()`) экран остаётся тем же, а ссылку на
 * «всех, кто ждёт решения» можно переслать.
 */
export function AdminProfilesTable({
  result,
  totals,
  status,
  q,
}: {
  result: Page<AdminProfileRow>;
  totals: ProfileTotals;
  status: ProfileFilter;
  q: string;
}) {
  const { run, pending, busyId, error } = useAdminAction();
  const [rejecting, setRejecting] = useState<string | null>(null);

  const params: Record<string, string> = {
    ...(status !== "all" ? { status } : {}),
    ...(q ? { q } : {}),
  };
  const shown = rangeText(result.page, result.pageSize, result.rows.length, result.total);

  return (
    <div>
      <h1 className="font-display text-3xl leading-[1.08] font-medium text-ink sm:text-4xl">
        Анкеты
      </h1>

      <AdminError error={error} />

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-medium text-ink">
            Модерация специалистов
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <p className="text-sm text-ink-soft">
              Опубликовано: {totals.active} из {totals.total}
            </p>
            <Link
              href="/admin/new"
              className="label-caps inline-flex min-h-11 items-center gap-2 bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal active:translate-y-px"
            >
              <Plus size={15} aria-hidden="true" />
              Добавить анкету
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={{
                pathname: "/admin/profiles",
                query: { ...(f.key !== "all" ? { status: f.key } : {}), ...(q ? { q } : {}) },
              }}
              aria-current={status === f.key ? "true" : undefined}
              className={`label-caps inline-flex min-h-9 items-center border px-3 transition-colors duration-300 ${
                status === f.key
                  ? "border-bronze bg-cream-deep text-ink"
                  : "border-line text-ink-soft hover:border-ink-faint hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <Form
          action="/admin/profiles"
          className="mt-4 flex items-center gap-3 border border-line bg-paper px-4 sm:max-w-xl"
        >
          <MagnifyingGlass size={16} className="text-ink-faint" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Поиск по имени или почте"
            aria-label="Поиск анкет по имени или почте"
            className="min-h-11 w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <button type="submit" className={actionButton}>
            Найти
          </button>
        </Form>

        {shown && <p className="mt-4 text-sm text-ink-soft">{shown}</p>}

        {result.total === 0 ? (
          totals.total === 0 ? (
            <div className="mt-8 border border-line bg-paper px-5 py-10 text-center">
              <p className="text-sm text-ink-soft">
                Анкет пока нет. Специалисты заполняют их сами, но вы можете
                завести анкету за человека.
              </p>
              <Link
                href="/admin/new"
                className="label-caps mt-6 inline-flex min-h-11 items-center gap-2 border border-ink px-6 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream"
              >
                <Plus size={15} aria-hidden="true" />
                Добавить анкету
              </Link>
            </div>
          ) : (
            <p className="mt-8 border border-line bg-paper px-5 py-8 text-sm text-ink-soft">
              Ничего не найдено. Попробуйте другой запрос или снимите фильтр.
            </p>
          )
        ) : result.rows.length === 0 ? (
          <p className="mt-8 border border-line bg-paper px-5 py-8 text-sm text-ink-soft">
            На этой странице пусто — вернитесь к началу списка.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {[
                    "Имя",
                    "Категория",
                    "Статус",
                    "Документы",
                    "Верификация",
                    "Действия",
                  ].map((h) => (
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
                {result.rows.map((p) => (
                  <ProfileRow
                    key={p.id}
                    profile={p}
                    busy={busyId === p.id || pending}
                    isBusyRow={busyId === p.id}
                    rejecting={rejecting === p.id}
                    onStartReject={() => setRejecting(p.id)}
                    onCancelReject={() => setRejecting(null)}
                    onModerate={(action, note) =>
                      run(
                        p.id,
                        () => moderateProfile({ profileId: p.id, action, note }),
                        action === "publish"
                          ? `Анкета «${p.fullName}» опубликована`
                          : action === "hide"
                            ? `Анкета «${p.fullName}» скрыта`
                            : `Анкета «${p.fullName}» отклонена`,
                        () => setRejecting(null)
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pager
          pathname="/admin/profiles"
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          params={params}
        />

        <p className="mt-4 text-xs text-ink-soft">
          Причина отклонения показывается специалисту в кабинете — формулируйте
          конкретно и доброжелательно.
        </p>
      </section>
    </div>
  );
}

function ProfileRow({
  profile,
  busy,
  isBusyRow,
  rejecting,
  onStartReject,
  onCancelReject,
  onModerate,
}: {
  profile: AdminProfileRow;
  busy: boolean;
  isBusyRow: boolean;
  rejecting: boolean;
  onStartReject: () => void;
  onCancelReject: () => void;
  onModerate: (action: "publish" | "hide" | "reject", note?: string) => void;
}) {
  const status = STATUS_LABEL[profile.status];
  // полный комплект принятых документов нужен только для премиума; публиковать
  // можно и без фото (семья увидит аватар), но не с непроверенным снимком
  const docsReady = profile.approvedDocuments === profile.requiredDocuments;

  return (
    <tr className="border-b border-line/60 align-top">
      <td className="py-4 pr-6 font-medium text-ink">
        {/* карточка анкеты: документы, решения и то, что видит семья */}
        <Link
          href={`/admin/profiles/${profile.id}`}
          className="border-b border-ink/30 pb-0.5 transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
        >
          {profile.fullName}
        </Link>
        <span className="mt-1 block text-xs font-normal text-ink-faint">
          {profile.email}
        </span>
        {profile.banned && (
          <span className="mt-1 block text-xs font-normal text-[#a5462f]">
            пользователь заблокирован
          </span>
        )}
      </td>
      <td className="py-4 pr-6 text-ink-soft">
        {categories[profile.category].label}
      </td>
      <td className="py-4 pr-6">
        <span className={`label-caps ${status.cls}`}>{status.text}</span>
        {profile.status === "rejected" && profile.moderationNote && (
          <span className="mt-1 block max-w-56 text-xs text-ink-faint">
            {profile.moderationNote}
          </span>
        )}
      </td>
      <td className="py-4 pr-6">
        <span className={docsReady ? "text-bronze-text" : "text-[#a5462f]"}>
          {profile.approvedDocuments}/{profile.requiredDocuments}
        </span>
        <span className="mt-1 block text-xs text-ink-faint">
          доп. {profile.approvedOptional}/{profile.optionalDocuments}
        </span>
        {profile.photoPending && (
          <span className="mt-1 block text-xs text-[#a5462f]">
            фото ждёт проверки
          </span>
        )}
        {!docsReady && profile.blockingSteps && (
          <span className="mt-1 block max-w-56 text-xs text-ink-faint">
            {profile.blockingSteps}
          </span>
        )}
      </td>
      <td className="py-4 pr-6 text-ink-soft">
        {VERIFICATION_LABEL[profile.verificationLevel]}
      </td>
      <td className="py-4">
        {rejecting ? (
          <RejectionForm
            placeholder="Причина отклонения (обязательно)"
            submitLabel="Отклонить"
            disabled={busy}
            onCancel={onCancelReject}
            onSubmit={(note) => onModerate("reject", note)}
          />
        ) : (
          <span className="flex flex-wrap gap-2">
            {profile.status === "active" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onModerate("hide")}
                className={actionButton}
              >
                Скрыть
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || profile.photoPending}
                title={
                  profile.photoPending
                    ? "Сначала примите или отклоните фотографию"
                    : undefined
                }
                onClick={() => onModerate("publish")}
                className={actionButton}
              >
                Опубликовать
              </button>
            )}
            {profile.status !== "rejected" && (
              <button
                type="button"
                disabled={busy}
                onClick={onStartReject}
                className={dangerButton}
              >
                Отклонить
              </button>
            )}
            {isBusyRow && (
              <span className="label-caps self-center text-ink-faint">…</span>
            )}
          </span>
        )}
      </td>
    </tr>
  );
}
