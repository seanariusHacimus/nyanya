"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  UploadSimple,
  CheckCircle,
  HourglassMedium,
  WarningCircle,
  Circle,
  Eye,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import type { VerificationStep } from "@/content/verification-steps";
import {
  uploadVerificationDocument,
  deleteVerificationDocument,
} from "@/lib/actions/specialist-profile";
import { PhotoGuidelinesDialog } from "@/components/specialist/photo-guidelines-dialog";

export type StepState = {
  status: "empty" | "pending" | "approved" | "rejected";
  fileName: string | null;
  fileKey: string | null;
  reviewNote: string | null;
};

const statusMeta = {
  empty: {
    icon: Circle,
    label: "Не загружено",
    tone: "text-ink-faint",
    box: "border-line bg-paper",
  },
  pending: {
    icon: HourglassMedium,
    label: "На проверке",
    tone: "text-bronze-text",
    box: "border-bronze/40 bg-cream-deep",
  },
  approved: {
    icon: CheckCircle,
    label: "Подтверждено",
    tone: "text-bronze-text",
    box: "border-bronze bg-cream-deep",
  },
  rejected: {
    icon: WarningCircle,
    label: "Отклонено",
    tone: "text-[#a5462f]",
    box: "border-[#a5462f]/50 bg-[#a5462f]/5",
  },
} as const;

export function VerificationStepCard({
  step,
  index,
  state,
  locked,
  onChange,
}: {
  step: VerificationStep;
  index: number;
  state: StepState;
  /** во время модерации менять документы нельзя */
  locked: boolean;
  onChange: (key: string, next: StepState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const meta = statusMeta[state.status];
  const StatusIcon = meta.icon;

  const upload = (file: File) => {
    setError(null);
    const data = new FormData();
    data.set("step", step.key);
    data.set("file", file);
    startTransition(async () => {
      const result = await uploadVerificationDocument(data);
      if (result.ok) {
        onChange(step.key, {
          status: "pending",
          fileName: result.fileName,
          fileKey: result.fileKey,
          reviewNote: null,
        });
        toast.success(`«${step.title}» загружен и отправлен на проверку`);
        // замена документа у опубликованной анкеты возвращает её на
        // повторную модерацию — баннер статуса должен это показать
        router.refresh();
      } else {
        const message =
          result.error === "too_large"
            ? "Файл больше 10 МБ — сожмите или сфотографируйте с меньшим разрешением."
            : result.error === "bad_type"
              ? "Подходят JPG, PNG, WEBP, HEIC или PDF — и содержимое файла должно соответствовать формату."
              : "Не удалось загрузить файл. Попробуйте ещё раз.";
        setError(message);
        toast.error(message);
      }
    });
  };

  return (
    <li
      className={`border p-6 transition-colors duration-300 sm:p-7 ${meta.box}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-bronze/50 font-display text-sm text-bronze-text"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {step.description}
            </p>
          </div>
        </div>
        <span
          className={`label-caps flex shrink-0 items-center gap-1.5 ${meta.tone}`}
        >
          <StatusIcon
            size={15}
            weight={state.status === "empty" ? "regular" : "fill"}
          />
          {meta.label}
        </span>
      </div>

      <ul className="mt-5 space-y-1.5 sm:ml-13">
        {step.hints.map((hint) => (
          <li key={hint} className="flex gap-2.5 text-xs text-ink-soft">
            <span
              aria-hidden="true"
              className="mt-[0.5em] block size-1 shrink-0 rounded-full bg-bronze/60"
            />
            {hint}
          </li>
        ))}
      </ul>

      {step.hasPhotoGuidelines && (
        <div className="mt-4 sm:ml-13">
          <PhotoGuidelinesDialog />
        </div>
      )}

      {state.status === "rejected" && state.reviewNote && (
        <p className="mt-5 border-l-2 border-[#a5462f] bg-cream px-4 py-3 text-sm leading-relaxed text-ink sm:ml-13">
          <span className="font-semibold">Комментарий модератора:</span>{" "}
          {state.reviewNote}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 sm:ml-13">
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

        {!locked && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="label-caps inline-flex min-h-11 items-center gap-2 border border-ink px-5 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-60"
          >
            {state.status === "empty" ? (
              <UploadSimple size={15} aria-hidden="true" />
            ) : (
              <ArrowCounterClockwise size={15} aria-hidden="true" />
            )}
            {pending
              ? "Загружаем…"
              : state.status === "empty"
                ? "Загрузить файл"
                : "Заменить"}
          </button>
        )}

        {state.fileKey && (
          <a
            href={`/api/documents/${state.fileKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="label-caps inline-flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-ink"
          >
            <Eye size={15} aria-hidden="true" />
            Посмотреть
          </a>
        )}

        {state.fileName && (
          <span className="max-w-[16rem] truncate text-xs text-ink-faint">
            {state.fileName}
          </span>
        )}

        {!locked && state.fileKey && (
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteVerificationDocument({
                  step: step.key,
                });
                if (result.ok) {
                  onChange(step.key, {
                    status: "empty",
                    fileName: null,
                    fileKey: null,
                    reviewNote: null,
                  });
                }
              })
            }
            className="label-caps min-h-11 text-ink-faint transition-colors duration-300 hover:text-[#a5462f]"
          >
            Удалить
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a5462f] sm:ml-13">
          {error}
        </p>
      )}
    </li>
  );
}
