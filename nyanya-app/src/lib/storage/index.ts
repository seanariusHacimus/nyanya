import crypto from "node:crypto";
import path from "node:path";

import { createLocalStore } from "./local";
import { createS3Store, readS3Config } from "./s3";
import {
  DocumentNotFoundError,
  type DocumentInput,
  type DocumentStore,
  type StoredObject,
} from "./types";

export { DocumentNotFoundError };
export type { DocumentInput, StoredObject };

// ограничения вынесены в limits.ts: их должен знать и браузер, а этот модуль
// тянет за собой node:crypto и SDK хранилища
export { ALLOWED_MIME, MAX_FILE_BYTES, MAX_FILE_LABEL, isAllowedMime } from "./limits";

/**
 * Ключ объекта: `<uuid анкеты>/<uuid файла>.<ext>`. Форма проверяется на
 * входе — ключ приходит из URL, и в S3 нет защиты каталогом, как у файловой
 * системы, поэтому единственная граница — этот шаблон.
 */
const KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/;

export function isValidDocumentKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
};

/** Расширение берём из имени файла, но доверяем ему только если оно «чистое». */
function extensionFor(mimeType: string, fileName: string): string {
  const fromName = path.extname(fileName).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return EXTENSION_BY_MIME[mimeType] ?? ".bin";
}

let store: DocumentStore | null = null;

function getStore(): DocumentStore {
  if (store) return store;

  const s3 = readS3Config();
  const provider = process.env.STORAGE_PROVIDER ?? (s3 ? "s3" : "local");

  if (provider === "s3") {
    if (!s3) {
      throw new Error(
        "STORAGE_PROVIDER=s3, но не заданы AWS_ENDPOINT_URL / AWS_S3_BUCKET_NAME / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY"
      );
    }
    store = createS3Store(s3);
  } else {
    store = createLocalStore();
  }

  return store;
}

/** Сохраняет документ и возвращает его ключ. */
export async function saveDocument(
  specialistId: string,
  file: DocumentInput
): Promise<string> {
  if (!UUID_PATTERN.test(specialistId)) {
    throw new Error(`invalid specialist id: ${specialistId}`);
  }
  const key = `${specialistId}/${crypto.randomUUID()}${extensionFor(
    file.mimeType,
    file.fileName
  )}`;
  await getStore().save(key, file);
  return key;
}

/** Открывает документ потоком. Бросает `DocumentNotFoundError`, если объекта нет. */
export async function openDocument(key: string): Promise<StoredObject> {
  if (!isValidDocumentKey(key)) throw new DocumentNotFoundError(key);
  return getStore().open(key);
}

/** Удаляет документ. Отсутствующий ключ ошибкой не считается. */
export async function removeDocument(key: string): Promise<void> {
  if (!isValidDocumentKey(key)) return;
  await getStore().remove(key);
}
