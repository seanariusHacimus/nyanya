"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  specialistProfiles,
  contactUnlocks,
  notifications,
  user,
} from "@/db/schema";
import { buildContacts } from "@/lib/specialists-shared";

const schema = z.object({ slug: z.string().trim().min(1).max(120) });

/**
 * Открытие контактов — бесплатно, но только после входа (решение владельца).
 * Идемпотентно: повторный вызов возвращает контакты без новой записи.
 */
export async function unlockContacts(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, error: "unauthorized" as const };

  const rows = await db
    .select({
      id: specialistProfiles.id,
      fullName: specialistProfiles.fullName,
      ownerId: specialistProfiles.userId,
      ownerPhone: user.phone,
    })
    .from(specialistProfiles)
    .innerJoin(user, eq(user.id, specialistProfiles.userId))
    .where(
      and(
        eq(specialistProfiles.slug, parsed.data.slug),
        eq(specialistProfiles.status, "active")
      )
    )
    .limit(1);

  const specialist = rows[0];
  if (!specialist) return { ok: false as const, error: "not_found" as const };
  if (!specialist.ownerPhone)
    return { ok: false as const, error: "no_contacts" as const };

  const inserted = await db
    .insert(contactUnlocks)
    .values({ parentId: session.user.id, specialistId: specialist.id })
    .onConflictDoNothing()
    .returning({ id: contactUnlocks.id });

  // события только при первом открытии
  if (inserted.length > 0) {
    await db
      .update(specialistProfiles)
      .set({ unlockCount: sql`${specialistProfiles.unlockCount} + 1` })
      .where(eq(specialistProfiles.id, specialist.id));
    await db.insert(notifications).values({
      userId: specialist.ownerId,
      type: "contact_unlocked",
      title: "Ваши контакты открыли",
      body: "Семья открыла ваши контакты в каталоге — возможно, вам скоро напишут.",
    });
  }

  return {
    ok: true as const,
    contacts: buildContacts(specialist.ownerPhone, parsed.data.slug),
  };
}
