import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";

import {
  DocumentNotFoundError,
  type DocumentInput,
  type DocumentStore,
  type StoredObject,
} from "./types";

/**
 * Файловое хранилище для локальной разработки: каталог `.storage/documents`
 * в корне приложения. На проде не используется — там S3 (см. `./s3`).
 */
export function createLocalStore(root?: string): DocumentStore {
  const ROOT = root ?? process.env.STORAGE_DIR ?? ".storage/documents";

  /** Не даёт ключу вырваться за пределы каталога (`../`, абсолютные пути). */
  function resolveWithin(key: string): string {
    const base = path.resolve(ROOT);
    const target = path.resolve(base, key);
    if (target !== base && !target.startsWith(base + path.sep)) {
      throw new DocumentNotFoundError(key);
    }
    return target;
  }

  return {
    async save(key: string, file: DocumentInput): Promise<void> {
      const target = resolveWithin(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.buffer);
    },

    async open(key: string): Promise<StoredObject> {
      const target = resolveWithin(key);
      let size: number;
      try {
        size = (await stat(target)).size;
      } catch {
        throw new DocumentNotFoundError(key);
      }
      const body = Readable.toWeb(
        createReadStream(target)
      ) as ReadableStream<Uint8Array>;
      return { body, contentLength: size };
    },

    async remove(key: string): Promise<void> {
      try {
        await unlink(resolveWithin(key));
      } catch {
        /* файла может уже не быть — удаление идемпотентно */
      }
    },
  };
}
