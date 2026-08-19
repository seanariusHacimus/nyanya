"use client";

import { useState } from "react";
import { ShareNetwork, Check } from "@phosphor-icons/react";

/** §5 P2 — «Поделиться»: копирует ссылку профиля (семьи пересылают анкеты друг другу). */
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          /* clipboard недоступен — молча пропускаем */
        }
      }}
      className="label-caps inline-flex min-h-11 items-center gap-2 text-ink-soft transition-colors duration-300 hover:text-bronze-text"
    >
      {copied ? (
        <>
          <Check size={14} aria-hidden="true" className="text-bronze" />
          Ссылка скопирована
        </>
      ) : (
        <>
          <ShareNetwork size={14} aria-hidden="true" />
          Поделиться
        </>
      )}
    </button>
  );
}
