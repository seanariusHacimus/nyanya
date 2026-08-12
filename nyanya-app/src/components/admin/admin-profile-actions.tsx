"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moderateProfile } from "@/lib/actions/admin";

/**
 * Решения по анкете: опубликовать, снять, отклонить.
 *
 * Отклонение требует причины — специалист видит её в кабинете, и «отклонено»
 * без объяснения оставляет человека в тупике. Поэтому причина спрашивается
 * в раскрывающемся блоке, а не крохотным полем рядом с кнопкой.
 *
 * Публикация заблокирована, пока не приняты обязательные документы, и рядом
 * написано, сколько их не хватает: заблокированная кнопка без объяснения
 * выглядит поломкой.
 */
export function AdminProfileActions({
  profileId,
  status,
  slug,
  canPublish,
  blocking,
  moderationNote,
}: {
  profileId: string;
  status: "draft" | "pending_review" | "active" | "hidden" | "rejected";
  slug: string | null;
  canPublish: boolean;
  blocking: number;
  moderationNote: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const run = (action: "publish" | "hide" | "reject", noteText?: string) =>
    start(async () => {
      setError(null);
      const result = await moderateProfile({
        profileId,
        action,
        note: noteText,
      });
      if (!result.ok) {
        setError(
          result.error === "documents_pending"
            ? "Сначала примите обязательные документы."
            : result.error === "note_required"
              ? "Укажите причину отклонения."
              : "Не удалось выполнить действие."
        );
        return;
      }
      setRejecting(false);
      setNote("");
      router.refresh();
    });

  const statusLabel = {
    draft: "Черновик",
    pending_review: "Ждёт решения",
    active: "Опубликована",
    hidden: "Снята с публикации",
    rejected: "Отклонена",
  }[status];

  return (
    <section className="mt-8 border border-line bg-cream-deep p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-base font-semibold text-ink">{statusLabel}</p>
        {status === "active" && slug && (
          <Link
            href={`/specialists/${slug}`}
            className="label-caps border-b border-ink/30 pb-0.5 text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
          >
            Открыть в каталоге
          </Link>
        )}
      </div>

      {moderationNote && status === "rejected" && (
        <p className="mt-3 border-l-2 border-[#a5462f] bg-cream px-4 py-3 text-sm leading-relaxed text-ink">
          <span className="font-semibold">Причина:</span> {moderationNote}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {status !== "active" && (
          <button
            type="button"
            onClick={() => run("publish")}
            disabled={pending || !canPublish}
            className="label-caps inline-flex min-h-11 items-center bg-ink px-6 text-cream transition-colors duration-300 hover:bg-charcoal disabled:opacity-40"
          >
            {pending ? "…" : "Опубликовать"}
          </button>
        )}

        {status === "active" && (
          <button
            type="button"
            onClick={() => run("hide")}
            disabled={pending}
            className="label-caps inline-flex min-h-11 items-center border border-ink px-6 text-ink transition-colors duration-300 hover:bg-ink hover:text-cream disabled:opacity-50"
          >
            Снять с публикации
          </button>
        )}

        {status !== "rejected" && (
          <button
            type="button"
            onClick={() => setRejecting((v) => !v)}
            disabled={pending}
            className="label-caps min-h-11 text-[#a5462f] transition-opacity duration-300 hover:opacity-70 disabled:opacity-50"
          >
            Отклонить
          </button>
        )}

        {!canPublish && status !== "active" && (
          <span className="text-sm text-ink-soft">
            Не принято обязательных документов: {blocking}
          </span>
        )}
      </div>

      {rejecting && (
        <div className="mt-5 border-t border-line pt-5">
          <label
            htmlFor="reject-note"
            className="text-sm font-semibold text-ink"
          >
            Причина отклонения
          </label>
          <p className="mt-1 text-xs text-ink-faint">
            Специалист увидит этот текст в кабинете — напишите, что исправить.
          </p>
          <textarea
            id="reject-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            className="mt-3 w-full border border-line bg-paper px-4 py-3 text-base text-ink focus:border-ink"
            placeholder="Например: на фотографии не видно лица"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => run("reject", note.trim())}
              disabled={pending || note.trim().length < 5}
              className="label-caps inline-flex min-h-11 items-center bg-[#a5462f] px-6 text-cream transition-opacity duration-300 hover:opacity-90 disabled:opacity-40"
            >
              Отклонить анкету
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="label-caps min-h-11 text-ink-soft transition-colors duration-300 hover:text-ink"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-[#a5462f]">
          {error}
        </p>
      )}
    </section>
  );
}
