import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSession>>
>["user"];

export function isAdmin(user: { role?: string | null } | null | undefined) {
  return user?.role === "admin";
}

export function isSpecialist(user: { role?: string | null } | null | undefined) {
  return user?.role === "specialist";
}
