"use client";

/**
 * ⛳ Демо-сессия фронтенда: всё хранится в localStorage браузера.
 * Заменяется реальной авторизацией и API при подключении бэкенда.
 * События "nyanya-demo" оповещают компоненты (шапку и т.д.) об изменениях.
 */

export type DemoRole = "parent" | "specialist";
export type DemoSession = { role: DemoRole; name: string };
export type DemoPayment = { slug: string; date: string; amount: number };
export type ProfileStatus = "draft" | "review" | "published";

const K = {
  session: "nyanya.demo.session",
  unlocked: "nyanya.demo.unlocked",
  favorites: "nyanya.demo.favorites",
  payments: "nyanya.demo.payments",
  profileStatus: "nyanya.demo.profile-status",
  profileDraft: "nyanya.demo.profile-draft",
  pending: "nyanya.demo.pending-registration",
} as const;

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("nyanya-demo"));
}

function remove(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
  window.dispatchEvent(new Event("nyanya-demo"));
}

/* ── сессия ── */

export const getSession = () => read<DemoSession | null>(K.session, null);
export const setSession = (s: DemoSession) => write(K.session, s);
export const clearSession = () => remove(K.session);

/* ── регистрация → подтверждение телефона (§9 R2→R3) ── */

export type PendingRegistration = { role: DemoRole; name: string; phone: string };
export const getPendingRegistration = () =>
  read<PendingRegistration | null>(K.pending, null);
export const setPendingRegistration = (p: PendingRegistration) =>
  write(K.pending, p);
export const clearPendingRegistration = () => remove(K.pending);

/* ── открытые контакты + платежи (§10/§11 K4-K5) ── */

export const getUnlocked = () => read<string[]>(K.unlocked, []);
export const isUnlocked = (slug: string) => getUnlocked().includes(slug);

export function unlock(slug: string, amount: number) {
  const unlocked = getUnlocked();
  if (!unlocked.includes(slug)) {
    write(K.unlocked, [...unlocked, slug]);
    const payments = read<DemoPayment[]>(K.payments, []);
    write(K.payments, [
      ...payments,
      { slug, date: new Date().toISOString(), amount },
    ]);
  }
}

export const getPayments = () => read<DemoPayment[]>(K.payments, []);

/* ── избранное (§11 K3, D11) ── */

export const getFavorites = () => read<string[]>(K.favorites, []);

export function toggleFavorite(slug: string): boolean {
  const favorites = getFavorites();
  const next = favorites.includes(slug)
    ? favorites.filter((f) => f !== slug)
    : [...favorites, slug];
  write(K.favorites, next);
  return next.includes(slug);
}

/* ── анкета специалиста (§8 статус-машина) ── */

export const getProfileStatus = () =>
  read<ProfileStatus>(K.profileStatus, "draft");
export const setProfileStatus = (s: ProfileStatus) => write(K.profileStatus, s);

export type ProfileDraft = Record<string, string | boolean>;
export const getProfileDraft = () => read<ProfileDraft>(K.profileDraft, {});
export const saveProfileDraft = (d: ProfileDraft) => write(K.profileDraft, d);

/* ── демо-контакты специалиста (после разблокировки) ── */

export function demoContacts(slug: string) {
  // детерминированный «телефон» из слага — данные явно демонстрационные
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 10000000;
  const digits = String(h).padStart(7, "0");
  const phone = `+998 9${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 6)} ${digits[6]}${digits[0]}`;
  return {
    phone,
    phoneHref: `tel:${phone.replace(/[^+\d]/g, "")}`,
    telegram: `@${slug.replace(/-/g, "_")}`,
    telegramHref: `https://t.me/${slug.replace(/-/g, "_")}`,
    whatsappHref: `https://wa.me/${phone.replace(/[^\d]/g, "")}`,
  };
}

/* ── подписка на изменения (для шапки и страниц) ── */

export function subscribeDemo(callback: () => void) {
  if (!isBrowser()) return () => {};
  window.addEventListener("nyanya-demo", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("nyanya-demo", callback);
    window.removeEventListener("storage", callback);
  };
}
