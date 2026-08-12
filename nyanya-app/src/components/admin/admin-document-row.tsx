"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  HourglassMedium,
  Trash,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import type { VerificationStep } from "@/content/verification-steps";
import {
  adminDeleteDocument,
  adminUploadDocument,
} from "@/lib/actions/admin-documents";
import { reviewDocument } from "@/lib/actions/admin";
import {
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
  isAllowedMime,
} from "@/lib/storage/limits";

/**
 * Один документ в карточке анкеты у администратора.
 *
 * Здесь и загрузка за специалиста, и решение по уже загруженному. Раньше это
 * жило в двух разных таблицах на разных концах страницы: файл принимали в
 * одной, анкету публиковали в другой.
 *
 * Размер и тип проверяются до отправки: тело серверного действия ограничено
 * платформой, и слишком большой файл обрывался бы раньше, чем наша проверка
 * успевала ответить, — вместо объяснения показывалась аварийная страница.
 */

export type AdminDocState = {
  /** id строки документа — по нему принимается решение. */
  documentId: string | null;
  status: "empty" | "pending" | "approved" | "rejected";
  fileKey: string | null;
  fileName: string | null;
  reviewNote: string | null;
};

const meta = {
  empty: { label: "Не загружен", icon: Circle, tone: "text-ink-faint" },
  pending: { label: "Ждёт решения", icon: HourglassMedium, tone: "text-bronze-text" },
  approved: { label: "Принят", icon: CheckCircle, tone: "text-bronze-text" },
  rejected: { label: "Отклонён", icon: WarningCircle, tone: "text-[#a5462f]" },
} as const;

export function AdminDocumentRow({
  profileId,
  step,
  state,
}: {
  profileId: string;
  step: VerificationStep;
  state: AdminDocState;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const info = meta[state.status];
  const Icon = info.icon;

  const upload = (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError(`Файл больше ${MAX_FILE_LABEL} — сожмите его.`);
      return;
    }
    if (file.type && !isAllowedMime(file.type)) {
      setError("Подходят JPG, PNG, WEBP, HEIC или PDF.");
      return;
    }
    const data = new FormData();
    data.set("profileId", profileId);
    data.set("step", step.key);
    data.set("file", file);
    start(async () => {
      const result = await adminUploadDocument(data);
      if (!result.ok) {
        setError(
          result.error === "too_large"
            ? `Файл больше ${MAX_FILE_LABEL}.`
            : result.error === "bad_type"
              ? "Формат не подходит или содержимое не совпадает с расширением."
              : "Не удалось загрузить файл."
        );
        return;
      }
      router.refresh();
    });
  };

  const decide = (decision: "approve" | "reject") => {
    if (!state.documentId) return;
    start(async () => {
      setError(null);
      const result = await reviewDocument({
        documentId: state.documentId,
        decision,
        // отклонение без причины действие отвергает: специалист видит её в кабинете
        note:
          decision === "reject"
            ? "Документ не подошёл — загрузите читаемый файл."
            : undefined,
      });
      if (!result.ok) {
        setError("Не удалось сохранить решение.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <li className="border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">
            {step.title}
            {!step.required && (
              <span className="label-caps ml-3 text-ink-faint">по желанию</span>
            )}
          </p>
          {state.fileName && (
            <p className="mt-1 truncate text-sm text-ink-soft">{state.fileName}</p>
          )}
        </div>
        <span className={`label-caps flex shrink-0 items-center gap-1.5 ${info.tone}`}>
          <Icon size={15} weight={state.status === "empty" ? "regular" : "fill"} />
          {info.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="label-caps inline-flex min-h-10 items-center gap-2 border border-ink px-4 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-50"
        >
          <UploadSimple size={14} aria-hidden="true" />
          {state.fileKey ? "Заменить" : "Загрузить"}
        </button>

        {state.fileKey && (
          <a
            href={`/api/documents/${state.fileKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="label-caps min-h-10 border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Открыть
          </a>
        )}

        {state.status === "pending" && state.documentId && (
          <>
            <button
              type="button"
              onClick={() => decide("approve")}
              disabled={pending}
              className="label-caps inline-flex min-h-10 items-center bg-ink px-4 text-cream transition-colors duration-300 hover:bg-charcoal disabled:opacity-50"
            >
              Принять
            </button>
            <button
              type="button"
              onClick={() => decide("reject")}
              disabled={pending}
              className="label-caps min-h-10 text-[#a5462f] transition-opacity duration-300 hover:opacity-70 disabled:opacity-50"
            >
              Отклонить
            </button>
          </>
        )}

        {state.fileKey && (
          <button
            type="button"
            onClick={() =>
              start(async () => {
                await adminDeleteDocument({ profileId, step: step.key });
                router.refresh();
              })
            }
            disabled={pending}
            className="label-caps ml-auto inline-flex min-h-10 items-center gap-1.5 text-ink-faint transition-colors duration-300 hover:text-[#a5462f] disabled:opacity-50"
          >
            <Trash size={14} aria-hidden="true" />
            Удалить
          </button>
        )}
      </div>

      {state.reviewNote && (
        <p className="mt-3 text-sm text-ink-soft">
          Причина отклонения: {state.reviewNote}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a5462f]">
          {error}
        </p>
      )}
    </li>
  );
}
