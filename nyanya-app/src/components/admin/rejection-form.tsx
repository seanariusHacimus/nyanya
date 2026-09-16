"use client";

import { useState } from "react";

/**
 * Отклонение всегда требует причины: специалист видит её в кабинете,
 * поэтому пустой отказ бесполезен. Форма общая для анкет и документов.
 */
export function RejectionForm({
  placeholder,
  submitLabel,
  disabled,
  onCancel,
  onSubmit,
}: {
  placeholder: string;
  submitLabel: string;
  disabled?: boolean;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = note.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={placeholder}
        maxLength={500}
        className="min-h-9 w-64 border border-line bg-paper px-3 text-xs text-ink placeholder:text-ink-faint focus:border-ink"
      />
      <button
        type="submit"
        disabled={disabled || !note.trim()}
        className="label-caps min-h-9 bg-ink px-3 text-cream disabled:opacity-50"
      >
        {submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="label-caps min-h-9 px-2 text-ink-soft"
      >
        Отмена
      </button>
    </form>
  );
}
