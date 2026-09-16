import { eq } from "drizzle-orm";
import type { DbExecutor } from "@/db";
import { documents } from "@/db/schema";
import type { CategoryKey } from "@/lib/specialists-shared";
import {
  deriveVerificationLevel,
  summarizeDocuments,
  type DocumentStatus,
} from "@/lib/verification";

/**
 * Уровень анкеты по фактическому состоянию её документов.
 *
 * Живёт здесь, а не в действии: считать его обязаны все, кто меняет документы
 * — и загрузка администратором, и удаление в кабинете. Копия этой функции в
 * `admin-documents.ts` и отсутствие вызова в `deleteVerificationDocument` уже
 * однажды разошлись: специалист удалял принятую фотографию, а в колонке
 * оставался прежний уровень, и каталог продолжал показывать значок, который
 * обещает семье проверку удалённого документа.
 *
 * Модуль намеренно НЕ `"use server"`: экспорт из такого файла — публичный
 * сетевой эндпоинт (та же причина, по которой оттуда убрали `recalcRating`).
 *
 * Исполнитель передаётся явно: внутри транзакции считать надо по её
 * незакоммиченным строкам, иначе уровень выйдет по состоянию «до решения».
 */
export async function levelForProfile(
  executor: DbExecutor,
  profileId: string,
  category: CategoryKey
) {
  const rows = await executor
    .select({ type: documents.type, status: documents.status })
    .from(documents)
    .where(eq(documents.specialistId, profileId));
  return deriveVerificationLevel(
    summarizeDocuments(
      rows.map((r) => ({ type: r.type, status: r.status as DocumentStatus })),
      category
    )
  );
}
