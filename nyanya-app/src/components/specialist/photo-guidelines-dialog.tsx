"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Info, Camera } from "@phosphor-icons/react";
import { photoGuidelines } from "@/content/verification-steps";
import { easeOutQuart } from "@/lib/motion";

/** Ссылка «Требования к фотографии» + окно с текстом владельца. */
export function PhotoGuidelinesDialog() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border-b border-ink/30 pb-0.5 text-sm text-ink transition-colors duration-300 hover:border-bronze hover:text-bronze-text"
      >
        <Info size={14} className="text-bronze" aria-hidden="true" />
        Требования к фотографии
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal-deep/60 p-0 sm:items-center sm:p-6"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={photoGuidelines.title}
              initial={reduce ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 32 }}
              transition={{ duration: 0.35, ease: easeOutQuart }}
              className="max-h-[85dvh] w-full max-w-lg overflow-y-auto bg-cream p-8 sm:rounded-[2px]"
            >
              <div className="flex items-start justify-between gap-4">
                <Camera size={30} weight="thin" className="text-bronze" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Закрыть"
                  className="flex size-10 items-center justify-center text-ink-soft hover:text-ink"
                >
                  <X size={20} />
                </button>
              </div>

              <h2 className="mt-4 font-display text-2xl font-medium text-ink">
                {photoGuidelines.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {photoGuidelines.intro}
              </p>

              <ul className="mt-5 space-y-2.5">
                {photoGuidelines.rules.map((rule) => (
                  <li
                    key={rule}
                    className="flex gap-3 text-sm leading-relaxed text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.55em] block size-1.5 shrink-0 rounded-full bg-bronze"
                    />
                    {rule}
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-l-2 border-bronze bg-cream-deep px-4 py-3 text-sm leading-relaxed text-ink">
                {photoGuidelines.warning}
              </p>
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                {photoGuidelines.outro}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
