"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { favorites, specialistProfiles } from "@/db/schema";

const schema = z.object({ slug: z.string().trim().min(1).max(120) });

/** Переключение избранного (§11 K3, D11). Требует сессии; владение — по parentId. */
export async function toggleFavoriteAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, error: "unauthorized" as const };

  const rows = await db
    .select({ id: specialistProfiles.id })
    .from(specialistProfiles)
    .where(
      and(
        eq(specialistProfiles.slug, parsed.data.slug),
        eq(specialistProfiles.status, "active")
      )
    )
    .limit(1);

  const specialist = rows[0];
  if (!specialist) return { ok: false as const, error: "not_found" as const };

  const existing = await db
    .select({ specialistId: favorites.specialistId })
    .from(favorites)
    .where(
      and(
        eq(favorites.parentId, session.user.id),
        eq(favorites.specialistId, specialist.id)
      )
    )
    .limit(1);

  let active: boolean;
  if (existing.length > 0) {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.parentId, session.user.id),
          eq(favorites.specialistId, specialist.id)
        )
      );
    active = false;
  } else {
    await db
      .insert(favorites)
      .values({ parentId: session.user.id, specialistId: specialist.id })
      .onConflictDoNothing();
    active = true;
  }

  revalidatePath("/account");
  return { ok: true as const, active };
}
