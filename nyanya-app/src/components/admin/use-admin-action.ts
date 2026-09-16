"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

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
    "Нельзя опубликовать: фотография не принята. Без неё карточка бесполезна семье, а проверять модератору нечего.",
};

export type AdminActionResult = {
  ok: boolean;
  error?: string;
  detail?: string;
};

/**
 * Одно решение модератора: показать «занято» на строке, перевести ответ
 * действия в человеческие слова и перечитать страницу.
 *
 * `router.refresh()` перечитывает ТЕКУЩИЙ адрес вместе с `?q=`, `?page=` и
 * `?status=`, поэтому после блокировки со страницы поиска модератор остаётся
 * на том же экране результатов. `revalidatePath("/admin")` в серверных
 * действиях динамическим страницам ничего не даёт — обновляет именно это.
 */
export function useAdminAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function run(
    id: string,
    call: () => Promise<AdminActionResult>,
    successText?: string,
    onSuccess?: () => void
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
        onSuccess?.();
        if (successText) toast.success(successText);
        router.refresh();
      }
      setBusyId(null);
    });
  }

  return { run, pending, busyId, error };
}
