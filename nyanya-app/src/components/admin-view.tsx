"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  IdentificationBadge,
  LockKeyOpen,
  ClipboardText,
  FileMagnifyingGlass,
  Percent,
  Warning,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import type {
  AdminData,
  AdminProfileRow,
  ProfileStatus,
} from "@/lib/queries/admin";
import { categories } from "@/lib/specialists-shared";
import { VERIFICATION_LABEL } from "@/lib/verification";
import { stepByKey } from "@/content/verification-steps";
import {
  moderateProfile,
  reviewDocument,
  setUserBlocked,
} from "@/lib/actions/admin";
import { RejectionForm } from "@/components/admin/rejection-form";
import { useToast } from "@/components/ui/toast";

const STATUS_LABEL: Record<ProfileStatus, { text: string; cls: string }> = {
  draft: { text: "Черновик", cls: "text-ink-faint" },
  pending_review: { text: "На проверке", cls: "text-ink" },
  active: { text: "Опубликована", cls: "text-bronze-text" },
  hidden: { text: "Скрыта", cls: "text-ink-faint" },
  rejected: { text: "Отклонена", cls: "text-[#a5462f]" },
};

const ERROR_TEXT: Record<string, string> = {
  unauthorized: "Сессия истекла — войдите заново.",
  forbidden: "Недостаточно прав.",
  invalid: "Некорректные данные.",
  not_found: "Запись не найдена — обновите страницу.",
  note_required: "Укажите причину.",
  self: "Нельзя заблокировать самого себя.",
  admin_target: "Администратора заблокировать нельзя.",
  ban_failed: "Не удалось изменить блокировку.",
  documents_not_approved:
    "Нельзя опубликовать: приняты не все обязательные документы. Значок в каталоге утверждает, что специалист проверен.",
};

const ROLE_LABEL: Record<string, string> = {
  parent: "Родитель",
  specialist: "Специалист",
  admin: "Администратор",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const actionButton =
  "label-caps min-h-9 border border-line px-3 text-ink-soft transition-colors duration-300 hover:border-ink-faint hover:text-ink disabled:opacity-40";
const dangerButton =
  "label-caps min-h-9 border border-line px-3 text-[#a5462f] transition-colors duration-300 hover:border-[#a5462f] disabled:opacity-40";

/** §13 — админ-панель: сводка, модерация анкет, проверка документов, доступ. */
export function AdminView({
  data,
  currentUserId,
}: {
  data: AdminData;
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingProfile, setRejectingProfile] = useState<string | null>(null);
  const [rejectingDocument, setRejectingDocument] = useState<string | null>(
    null
  );
  const [userQuery, setUserQuery] = useState("");

  function run(
    id: string,
    call: () => Promise<{ ok: boolean; error?: string; detail?: string }>,
    successText?: string
  ) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const result = await call();
      if (!result.ok) {
        const base =
          ERROR_TEXT[result.error ?? ""] ?? "Не удалось выполнить действие.";
        const message = result.detail
          ? `${base} Ожидают: ${result.detail}.`
          : base;
        setError(message);
        toast.error(message);
      } else {
        setRejectingProfile(null);
        setRejectingDocument(null);
        if (successText) toast.success(successText);
        router.refresh();
      }
      setBusyId(null);
    });
  }

  const stats = [
    { icon: Users, label: "Родители", value: data.stats.parents },
    {
      icon: IdentificationBadge,
      label: "Специалисты",
      value: data.stats.specialists,
    },
    {
      icon: ClipboardText,
      label: "Анкеты на проверке",
      value: data.stats.pendingProfiles,
    },
    {
      icon: FileMagnifyingGlass,
      label: "Документы на проверке",
      value: data.stats.pendingDocuments,
    },
    { icon: LockKeyOpen, label: "Открытий контактов", value: data.stats.unlocks },
    { icon: Percent, label: "Конверсия", value: `${data.stats.conversion}%` },
  ];

  const publishedCount = data.profiles.filter(
    (p) => p.status === "active"
  ).length;

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [data.users, userQuery]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
      <p className="label-caps text-bronze-text">Админ-панель</p>
      <h1 className="mt-3 font-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">
        Управление платформой
      </h1>

      {error && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 border border-[#a5462f]/40 bg-[#a5462f]/5 px-4 py-3 text-sm text-[#a5462f]"
        >
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* AD1 — сводка из базы */}
      <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
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

      {/* AD2 — модерация анкет */}
      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-medium text-ink">
            Модерация специалистов
          </h2>
          <p className="text-sm text-ink-soft">
            Опубликовано: {publishedCount} из {data.profiles.length}
          </p>
        </div>

        {data.profiles.length === 0 ? (
          <p className="mt-8 border border-line bg-paper px-5 py-8 text-sm text-ink-soft">
            Анкет пока нет.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto">
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
                {data.profiles.map((p) => (
                  <ProfileRow
                    key={p.id}
                    profile={p}
                    busy={busyId === p.id || pending}
                    isBusyRow={busyId === p.id}
                    rejecting={rejectingProfile === p.id}
                    onStartReject={() => setRejectingProfile(p.id)}
                    onCancelReject={() => setRejectingProfile(null)}
                    onModerate={(action, note) =>
                      run(
                        p.id,
                        () => moderateProfile({ profileId: p.id, action, note }),
                        action === "publish"
                          ? `Анкета «${p.fullName}» опубликована`
                          : action === "hide"
                            ? `Анкета «${p.fullName}» скрыта`
                            : `Анкета «${p.fullName}» отклонена`
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-ink-soft">
          Причина отклонения показывается специалисту в кабинете — формулируйте
          конкретно и доброжелательно.
        </p>
      </section>

      {/* AD3 — очередь проверки документов */}
      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-medium text-ink">
            Проверка документов
          </h2>
          <p className="text-sm text-ink-soft">
            В очереди: {data.documentQueue.length}
          </p>
        </div>

        {data.documentQueue.length === 0 ? (
          <p className="mt-8 border border-line bg-paper px-5 py-8 text-sm text-ink-soft">
            Очередь пуста — новые документы появятся здесь сразу после загрузки.
          </p>
        ) : (
          <ul className="mt-8 grid gap-3">
            {data.documentQueue.map((doc) => {
              const rejecting = rejectingDocument === doc.id;
              const busy = busyId === doc.id || pending;
              return (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-line bg-paper px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{doc.specialistName}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {stepByKey.get(doc.type as never)?.title ?? doc.type} ·{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/documents/${doc.fileKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={actionButton}
                    >
                      Открыть файл
                    </a>
                    {rejecting ? (
                      <RejectionForm
                        placeholder="Что не так с документом"
                        submitLabel="Отклонить"
                        disabled={busy}
                        onCancel={() => setRejectingDocument(null)}
                        onSubmit={(note) =>
                          run(
                            doc.id,
                            () =>
                              reviewDocument({
                                documentId: doc.id,
                                decision: "reject",
                                note,
                              }),
                            "Документ отклонён, специалист уведомлён"
                          )
                        }
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(
                              doc.id,
                              () =>
                                reviewDocument({
                                  documentId: doc.id,
                                  decision: "approve",
                                }),
                              "Документ принят"
                            )
                          }
                          className={actionButton}
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setRejectingDocument(doc.id)}
                          className={dangerButton}
                        >
                          Отклонить
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* AD4 — пользователи и доступ */}
      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-medium text-ink">
            Пользователи
          </h2>
          <p className="text-sm text-ink-soft">
            Показано {filteredUsers.length} из {data.usersTotal}
          </p>
        </div>

        <label className="mt-6 flex items-center gap-3 border border-line bg-paper px-4 sm:max-w-md">
          <MagnifyingGlass size={16} className="text-ink-faint" aria-hidden="true" />
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Поиск по имени или почте"
            className="min-h-11 w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </label>

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
              {filteredUsers.map((u) => {
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
          {filteredUsers.length === 0 && (
            <p className="border-b border-line/60 py-8 text-sm text-ink-soft">
              Никого не найдено.
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Блокировка закрывает вход и завершает активные сессии. Анкета
          заблокированного специалиста скрывается из каталога.
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
  // публикация и премиум возможны только при полном комплекте принятых документов
  const docsReady = profile.approvedDocuments === profile.requiredDocuments;

  return (
    <tr className="border-b border-line/60 align-top">
      <td className="py-4 pr-6 font-medium text-ink">
        {profile.fullName}
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
                disabled={busy || !docsReady}
                title={
                  docsReady
                    ? undefined
                    : `Не приняты документы: ${profile.blockingSteps}`
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
