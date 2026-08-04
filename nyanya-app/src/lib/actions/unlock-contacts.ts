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
  payments,
  user,
} from "@/db/schema";
import { buildContacts } from "@/lib/specialists-shared";
import { resolveProvider, unlockFee } from "@/lib/payments";

const schema = z.object({ slug: z.string().trim().min(1).max(120) });

/**
 * Открытие контактов специалиста — платное (решение владельца, 2026-08-03).
 *
 * Порядок такой: сначала запись о платеже, потом обращение к провайдеру и
 * только после подтверждения — открытие контактов. Контакты не отдаются
 * раньше, чем платёж получил статус `paid`.
 *
 * Повторный вызов бесплатен и идемпотентен: если контакты уже открыты,
 * возвращаем их, не создавая новый платёж. Иначе перезагрузка страницы
 * списывала бы деньги повторно.
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

  // уже оплачено раньше — просто отдаём контакты
  const [existing] = await db
    .select({ id: contactUnlocks.id })
    .from(contactUnlocks)
    .where(
      and(
        eq(contactUnlocks.parentId, session.user.id),
        eq(contactUnlocks.specialistId, specialist.id)
      )
    )
    .limit(1);

  if (existing) {
    return {
      ok: true as const,
      contacts: buildContacts(specialist.ownerPhone, parsed.data.slug),
    };
  }

  const amount = unlockFee();

  const [payment] = await db
    .insert(payments)
    .values({
      userId: session.user.id,
      purpose: "contact_unlock",
      amount,
      currency: "UZS",
      provider: resolveProvider().name,
      status: "pending",
      relatedSpecialistId: specialist.id,
    })
    .returning({ id: payments.id });

  let intent;
  try {
    intent = await resolveProvider().createPayment({
      amount,
      currency: "UZS",
      purpose: "contact_unlock",
      orderId: payment.id,
      description: `Доступ к контактам: ${specialist.fullName}`,
    });
  } catch (error) {
    console.error("[unlock] provider failed", { paymentId: payment.id, error });
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, payment.id));
    return { ok: false as const, error: "payment_failed" as const };
  }

  if (intent.status === "failed") {
    await db
      .update(payments)
      .set({ status: "failed", raw: { reason: intent.reason } })
      .where(eq(payments.id, payment.id));
    return { ok: false as const, error: "payment_failed" as const };
  }

  if (intent.status === "redirect") {
    // Платёж подтвердит вебхук провайдера; контакты откроются после этого.
    await db
      .update(payments)
      .set({ providerTxnId: intent.providerTxnId })
      .where(eq(payments.id, payment.id));
    return { ok: true as const, redirectUrl: intent.redirectUrl };
  }

  // подтверждено сразу
  await db
    .update(payments)
    .set({
      status: "paid",
      providerTxnId: intent.providerTxnId,
      paidAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  const inserted = await db
    .insert(contactUnlocks)
    .values({
      parentId: session.user.id,
      specialistId: specialist.id,
      paymentId: payment.id,
    })
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
      body: "Семья оплатила доступ к вашим контактам — возможно, вам скоро напишут.",
    });
  }

  return {
    ok: true as const,
    contacts: buildContacts(specialist.ownerPhone, parsed.data.slug),
  };
}
