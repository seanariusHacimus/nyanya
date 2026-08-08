"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";

/**
 * Всплывающие подтверждения действий (Ф8).
 *
 * До этого успешное действие выглядело как «ничего не произошло»: страница
 * тихо перерисовывалась. Ошибки показывались баннером, успех — никак.
 */

type ToastTone = "success" | "error";
type Toast = { id: number; tone: ToastTone; text: string };

type ToastApi = {
  success: (text: string) => void;
  error: (text: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Сколько держим сообщение на экране. */
const LIFETIME_MS = 4000;

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: ToastTone, text: string) => {
    const id = nextId++;
    setToasts((list) => [...list, { id, tone, text }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push("success", text),
      error: (text) => push("error", text),
    }),
    [push]
  );

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // aria-live: скринридер объявит сообщение, не уводя фокус
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isError = toast.tone === "error";
  const Icon = isError ? WarningCircle : CheckCircle;

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border px-4 py-3 shadow-[0_12px_32px_rgba(33,31,26,0.14)] ${
        isError
          ? "border-[#a5462f]/50 bg-[#fbf3f1]"
          : "border-bronze/50 bg-cream-deep"
      }`}
    >
      <Icon
        size={18}
        weight="thin"
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${isError ? "text-[#a5462f]" : "text-bronze"}`}
      />
      <p className="flex-1 text-sm leading-relaxed text-ink">{toast.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Закрыть уведомление"
        className="-m-1 shrink-0 p-1 text-ink-faint transition-colors duration-300 hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Провайдер монтируется в корневом layout, поэтому хук доступен везде.
 * Если его всё же вызвали вне провайдера — молча ничего не делаем: тост
 * не та вещь, ради которой стоит ронять страницу.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return ctx ?? { success: () => {}, error: () => {} };
}
