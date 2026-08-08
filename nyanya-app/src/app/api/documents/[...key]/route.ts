import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents, specialistProfiles } from "@/db/schema";
import { DocumentNotFoundError, openDocument } from "@/lib/storage";

/**
 * Выдача документа верификации. Паспорта и медсправки — чувствительные данные,
 * поэтому файл отдаётся только владельцу анкеты и администратору.
 * Исключение: фотография профиля публична (её видят в каталоге).
 *
 * Тело объекта проксируется потоком: файл не собирается целиком в памяти
 * процесса, а бакет остаётся приватным — прямых ссылок наружу нет.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params;
  const key = segments.join("/");

  const rows = await db
    .select({
      type: documents.type,
      mimeType: documents.mimeType,
      fileName: documents.fileName,
      ownerId: specialistProfiles.userId,
    })
    .from(documents)
    .innerJoin(
      specialistProfiles,
      eq(specialistProfiles.id, documents.specialistId)
    )
    .where(eq(documents.fileKey, key))
    .limit(1);

  const doc = rows[0];
  if (!doc) return new Response("Not found", { status: 404 });

  const isPublicPhoto = doc.type === "profile_photo";
  if (!isPublicPhoto) {
    const session = await auth.api.getSession({ headers: await headers() });
    const isOwner = session?.user.id === doc.ownerId;
    const isAdmin = session?.user.role === "admin";
    if (!isOwner && !isAdmin) return new Response("Forbidden", { status: 403 });
  }

  let object;
  try {
    object = await openDocument(key);
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return new Response("Not found", { status: 404 });
    }
    // Хранилище недоступно — это сбой, а не отсутствие файла. Прятать его за
    // 404 нельзя: тогда деградация выглядит как удалённые документы.
    console.error("[documents] storage read failed", { key, error });
    return new Response("Storage unavailable", { status: 502 });
  }

  const responseHeaders = new Headers({
    "Content-Type":
      doc.mimeType ?? object.contentType ?? "application/octet-stream",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
      doc.fileName ?? "document"
    )}`,
    // приватные документы не кэшируются посредниками
    "Cache-Control": isPublicPhoto
      ? "public, max-age=3600"
      : "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (object.contentLength !== undefined) {
    responseHeaders.set("Content-Length", String(object.contentLength));
  }

  return new Response(object.body, { headers: responseHeaders });
}
