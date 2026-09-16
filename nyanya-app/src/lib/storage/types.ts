/**
 * Контракт хранилища документов верификации.
 *
 * Интерфейс намеренно узкий — save / open / remove. Провайдер выбирается
 * переменной `STORAGE_PROVIDER` (`s3` · `local`), вызывающий код о нём не знает.
 */

export type DocumentInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  contentType?: string;
  contentLength?: number;
};

export interface DocumentStore {
  /** Записывает объект по готовому ключу. Перезапись допустима. */
  save(key: string, file: DocumentInput): Promise<void>;
  /** Открывает объект на чтение потоком. */
  open(key: string): Promise<StoredObject>;
  /** Удаляет объект. Идемпотентно: отсутствующий ключ — не ошибка. */
  remove(key: string): Promise<void>;
}

/**
 * Объекта нет. Отделён от инфраструктурных сбоев, чтобы маршрут выдачи
 * не превращал недоступность хранилища в 404.
 */
export class DocumentNotFoundError extends Error {
  constructor(key: string) {
    super(`document not found: ${key}`);
    this.name = "DocumentNotFoundError";
  }
}
