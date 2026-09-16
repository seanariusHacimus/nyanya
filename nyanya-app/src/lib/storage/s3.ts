import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  DocumentNotFoundError,
  type DocumentInput,
  type DocumentStore,
  type StoredObject,
} from "./types";

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

/**
 * Читает конфигурацию S3 из окружения. Возвращает `null`, если хранилище
 * не сконфигурировано — это нормальный случай для локальной разработки.
 *
 * Имена `AWS_*` — те, что отдаёт `railway bucket credentials`; префикс `S3_*`
 * оставлен как явное переопределение.
 */
export function readS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT ?? process.env.AWS_ENDPOINT_URL;
  const bucket = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.S3_REGION ?? process.env.AWS_DEFAULT_REGION ?? "auto",
    // Railway-бакеты адресуются virtual-host; path-style оставлен для
    // совместимости с MinIO и локальными эмуляторами.
    forcePathStyle: process.env.S3_URL_STYLE === "path",
  };
}

/** 404 от хранилища против настоящего сбоя сети/прав. */
function isMissingObject(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const err = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    err.name === "NoSuchKey" ||
    err.name === "NotFound" ||
    err.$metadata?.httpStatusCode === 404
  );
}

export function createS3Store(config: S3Config): DocumentStore {
  // Клиент переиспользуется между запросами — держит пул TCP-соединений.
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Сетевые сбои и 5xx повторяются с экспоненциальной задержкой.
    maxAttempts: 4,
    retryMode: "adaptive",
    requestHandler: {
      connectionTimeout: 3_000,
      requestTimeout: 30_000,
    },
  });

  return {
    async save(key: string, file: DocumentInput): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: file.buffer,
          ContentLength: file.buffer.byteLength,
          ContentType: file.mimeType,
          // Документы приватные: бакет не публичный, отдаём только через
          // защищённый маршрут — посредникам кэшировать нечего.
          CacheControl: "private, no-store",
        })
      );
    },

    async open(key: string): Promise<StoredObject> {
      try {
        const out = await client.send(
          new GetObjectCommand({ Bucket: config.bucket, Key: key })
        );
        if (!out.Body) throw new DocumentNotFoundError(key);
        return {
          body: out.Body.transformToWebStream(),
          contentType: out.ContentType,
          contentLength: out.ContentLength,
        };
      } catch (error) {
        if (isMissingObject(error)) throw new DocumentNotFoundError(key);
        throw error;
      }
    },

    async remove(key: string): Promise<void> {
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: config.bucket, Key: key })
        );
      } catch (error) {
        // Отсутствующий объект — не ошибка; остальное поднимаем наверх.
        if (!isMissingObject(error)) throw error;
      }
    },
  };
}
