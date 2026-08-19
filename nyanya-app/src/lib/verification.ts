import {
  DOCUMENTS_PAUSED,
  allStepsForCategory,
  requiredStepsForCategory,
  stepsForCategory,
  verificationSteps,
} from "@/content/verification-steps";
import type { CategoryKey } from "@/lib/specialists-shared";

/**
 * Правила верификации специалиста — единый источник для кабинета,
 * модерации и публикации.
 *
 * Два уровня (решение владельца, 2026-08-08):
 *   «Проверен»         — приняты все ОБЯЗАТЕЛЬНЫЕ документы;
 *   «Премиум-проверен» — приняты вообще все, включая рекомендуемые.
 *
 * Ключевой инвариант: **анкета публикуется только когда приняты все
 * обязательные документы**. Значок в каталоге утверждает, что специалист
 * проверен, — публиковать непроверенного значит обманывать семью.
 *
 * Перечень зависит от категории: водителю добавляется удостоверение.
 */

export type DocumentStatus = "pending" | "approved" | "rejected";
export type VerificationLevel = "unverified" | "verified" | "premium_verified";

export type DocumentRow = { type: string; status: DocumentStatus };

export type DocumentSummary = {
  approvedRequired: string[];
  /** Обязательные шаги, которые ещё не приняты (нет файла, ждут проверки или отклонены). */
  blockingRequired: string[];
  approvedOptional: string[];
  /** Рекомендуемые шаги, которых не хватает до премиума. */
  blockingOptional: string[];
  requiredCount: number;
  optionalCount: number;
  /** Все обязательные приняты. */
  allRequiredApproved: boolean;
  /** Приняты вообще все документы — доступен «Премиум-проверен». */
  allApproved: boolean;
  /**
   * Фотография принята — минимум для публикации (решение владельца,
   * 2026-08-12). Каталогу нужна анкета с лицом и рассказом о себе; справки
   * поднимают её до премиума, но не решают, показывать человека или нет.
   */
  photoApproved: boolean;
};

export function summarizeDocuments(
  rows: DocumentRow[],
  category: CategoryKey
): DocumentSummary {
  const byType = new Map(rows.map((r) => [r.type, r.status]));
  const applicable = stepsForCategory(category);
  const required = requiredStepsForCategory(category);
  const optional = applicable.filter((s) => !s.required);

  const isApproved = (key: string) => byType.get(key) === "approved";

  const approvedRequired = required.filter((s) => isApproved(s.key)).map((s) => s.key);
  const blockingRequired = required.filter((s) => !isApproved(s.key)).map((s) => s.key);
  const approvedOptional = optional.filter((s) => isApproved(s.key)).map((s) => s.key);
  const blockingOptional = optional.filter((s) => !isApproved(s.key)).map((s) => s.key);

  return {
    approvedRequired,
    blockingRequired,
    approvedOptional,
    blockingOptional,
    requiredCount: required.length,
    optionalCount: optional.length,
    allRequiredApproved: blockingRequired.length === 0,
    allApproved: blockingRequired.length === 0 && blockingOptional.length === 0,
    photoApproved: isApproved("profile_photo"),
  };
}

/**
 * Уровень выводится из документов, а не выставляется вручную. Премиум не
 * «выдаётся сверху»: он означает полный комплект, поэтому при потере любого
 * документа падает вместе с остальным.
 */
export function deriveVerificationLevel(
  summary: DocumentSummary
): VerificationLevel {
  /**
   * Два уровня, и граница между ними — не «сколько документов», а «что мы
   * можем утверждать» (решение владельца, 2026-08-12):
   *
   *   «Проверен модератором» — модератор видел фотографию и анкету. Этого
   *      достаточно, чтобы показать человека семье: она видит лицо, район,
   *      цену и рассказ о себе, и понимает, что документы не проверялись.
   *   «Премиум-проверен» — приняты ВСЕ документы: личность, здоровье,
   *      отсутствие судимости. Только это мы называем верификацией.
   *
   * Фотография — минимум, потому что без лица анкета бесполезна семье и
   * бессмысленна для модератора: проверять нечего.
   *
   * На паузе документов (когда запрашивается только фото) премиум не
   * выдаётся автоматически: список рекомендуемых пуст, `allApproved` стал бы
   * истиной сразу после селфи, и каждая анкета получала бы премиум ни за что.
   */
  if (!summary.photoApproved) return "unverified";
  if (DOCUMENTS_PAUSED) return "verified";
  return summary.allApproved ? "premium_verified" : "verified";
}

/**
 * Все документы специалиста приняты — включая выключенные паузой шаги.
 *
 * Нужно админке: специалисты успели загрузить полный комплект до паузы, и
 * модератор должен иметь возможность его проверить и выдать премиум. Обычная
 * сводка их не видит, потому что смотрит только на включённые шаги.
 */
export function summarizeAllDocuments(
  rows: DocumentRow[],
  category: CategoryKey
): DocumentSummary {
  const byType = new Map(rows.map((r) => [r.type, r.status]));
  const all = allStepsForCategory(category);
  const isApproved = (key: string) => byType.get(key) === "approved";
  const uploaded = all.filter((s) => byType.has(s.key));

  const approved = uploaded.filter((s) => isApproved(s.key)).map((s) => s.key);
  const blocking = uploaded.filter((s) => !isApproved(s.key)).map((s) => s.key);
  const missing = all.filter((s) => !byType.has(s.key)).map((s) => s.key);

  return {
    approvedRequired: approved,
    blockingRequired: blocking.concat(missing),
    approvedOptional: [],
    blockingOptional: [],
    requiredCount: all.length,
    optionalCount: 0,
    allRequiredApproved: blocking.length === 0 && missing.length === 0,
    allApproved: blocking.length === 0 && missing.length === 0,
    photoApproved: isApproved("profile_photo"),
  };
}

/** Человекочитаемые названия шагов — для сообщений модератору и специалисту. */
export function stepTitles(keys: string[]): string {
  return keys
    .map((k) => verificationSteps.find((s) => s.key === k)?.title ?? k)
    .join(", ");
}

/** Подписи уровней — одинаковые в каталоге, кабинете и админке. */
export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  unverified: "Не проверен",
  // «Проверен модератором», а не просто «Проверен»: документы при этом могли
  // не проверяться ни разу, и одно слово создавало ложное впечатление
  verified: "Проверен модератором",
  premium_verified: "Премиум-проверен",
};

/** Что означает каждый уровень — для публичных страниц и подсказок. */
export const VERIFICATION_MEANING: Record<VerificationLevel, string> = {
  unverified: "Модератор ещё не принял то, что загрузил специалист.",
  verified:
    "Модератор проверил анкету и фотографию. Документы, удостоверяющие личность и здоровье, не проверялись.",
  premium_verified:
    "Администратор проверил документы специалиста — личность, здоровье и отсутствие судимости.",
};
