import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Хранилище документов верификации.
 *
 * Файлы лежат на постоянном томе Railway (/data), вне публичной папки —
 * отдаются только через защищённый маршрут с проверкой прав. Локально
 * используется .storage в корне приложения.
 *
 * Интерфейс намеренно узкий (save/read/remove), чтобы при переезде на
 * S3/R2 менялась только эта реализация.
 */

const ROOT =
  process.env.STORAGE_DIR ??
  (process.env.RAILWAY_ENVIRONMENT ? "/data/documents" : ".storage/documents");

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 МБ

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export function isAllowedMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

function extensionFor(mime: string, fileName: string): string {
  const fromName = path.extname(fileName).toLowerCase();
  if (fromName && /^\.[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "application/pdf": ".pdf",
  };
  return map[mime] ?? ".bin";
}

/** Сохраняет файл и возвращает ключ вида "<specialistId>/<uuid>.<ext>". */
export async function saveDocument(
  specialistId: string,
  file: { buffer: Buffer; fileName: string; mimeType: string }
): Promise<string> {
  const dir = path.join(ROOT, specialistId);
  await mkdir(dir, { recursive: true });
  const key = `${specialistId}/${crypto.randomUUID()}${extensionFor(
    file.mimeType,
    file.fileName
  )}`;
  await writeFile(path.join(ROOT, key), file.buffer);
  return key;
}

export async function readDocument(key: string): Promise<Buffer> {
  // защита от выхода за пределы каталога
  const target = path.resolve(ROOT, key);
  if (!target.startsWith(path.resolve(ROOT))) throw new Error("invalid_key");
  return readFile(target);
}

export async function removeDocument(key: string): Promise<void> {
  try {
    const target = path.resolve(ROOT, key);
    if (target.startsWith(path.resolve(ROOT))) await unlink(target);
  } catch {
    /* файла может уже не быть — не критично */
  }
}
