import { verificationSteps } from "@/content/verification-steps";

/**
 * Правила верификации специалиста — единый источник для кабинета,
 * модерации и публикации.
 *
 * Ключевой инвариант: **анкета публикуется только когда все обязательные
 * документы приняты**. В каталоге всего два состояния значка — «Проверен» и
 * «Премиум-проверка», третьего («не проверен») в интерфейсе нет. Значит,
 * опубликованная анкета с непроверенным паспортом выглядела бы как
 * проверенная — это прямой обман семьи, а не косметическая неточность.
 */

export type DocumentStatus = "pending" | "approved" | "rejected";
export type VerificationLevel = "unverified" | "verified" | "premium_verified";

/** Пока обязательны все шаги: необязательных в списке нет. */
export const REQUIRED_STEP_KEYS = verificationSteps.map((s) => s.key);

export type DocumentRow = { type: string; status: DocumentStatus };

export type DocumentSummary = {
  approved: string[];
  pending: string[];
  rejected: string[];
  /** Обязательные шаги, по которым файл вообще не загружен. */
  missing: string[];
  approvedCount: number;
  requiredCount: number;
  /** Все обязательные документы приняты — анкету можно публиковать. */
  allApproved: boolean;
};

export function summarizeDocuments(rows: DocumentRow[]): DocumentSummary {
  const byType = new Map(rows.map((r) => [r.type, r.status]));

  const approved: string[] = [];
  const pending: string[] = [];
  const rejected: string[] = [];
  const missing: string[] = [];

  for (const key of REQUIRED_STEP_KEYS) {
    const status = byType.get(key);
    if (!status) missing.push(key);
    else if (status === "approved") approved.push(key);
    else if (status === "rejected") rejected.push(key);
    else pending.push(key);
  }

  return {
    approved,
    pending,
    rejected,
    missing,
    approvedCount: approved.length,
    requiredCount: REQUIRED_STEP_KEYS.length,
    allApproved: approved.length === REQUIRED_STEP_KEYS.length,
  };
}

/**
 * Уровень верификации выводится из документов, а не выставляется вручную.
 * Премиум — надстройка над полной проверкой: если хоть один документ
 * перестал быть принятым, премиум тоже снимается.
 */
export function deriveVerificationLevel(
  summary: DocumentSummary,
  current: VerificationLevel
): VerificationLevel {
  if (!summary.allApproved) return "unverified";
  return current === "premium_verified" ? "premium_verified" : "verified";
}

/** Человекочитаемые названия шагов — для сообщений модератору и специалисту. */
export function stepTitles(keys: string[]): string {
  const titles = keys.map(
    (k) => verificationSteps.find((s) => s.key === k)?.title ?? k
  );
  return titles.join(", ");
}
