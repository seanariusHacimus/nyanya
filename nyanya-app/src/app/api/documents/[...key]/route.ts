import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents, specialistProfiles } from "@/db/schema";
import { readDocument } from "@/lib/storage";

/**
 * Выдача документа верификации. Паспорта и медсправки — чувствительные данные,
 * поэтому файл отдаётся только владельцу анкеты и администратору.
 * Исключение: фотография профиля публична (её видят в каталоге).
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

  try {
    const buffer = await readDocument(key);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName ?? "document")}"`,
        // приватные документы не кэшируются посредниками
        "Cache-Control": isPublicPhoto
          ? "public, max-age=3600"
          : "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
