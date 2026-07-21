/** Format a UZS amount with thin grouping, e.g. 1 200 000. */
export function formatUZS(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount);
}

/** Years-of-experience helper kept locale-agnostic; label comes from messages. */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Pick a localized string from RU/UZ/EN columns by active locale. */
export function localizedName(
  locale: string,
  ru: string,
  uz: string,
  en: string,
): string {
  return (locale === "uz" ? uz : locale === "en" ? en : ru) || ru;
}

/**
 * Canonical language values (stored in the DB, Russian) with localized labels.
 * The stored `value` is what profiles/filters persist; the label is display-only.
 */
export const LANGUAGES = [
  { value: "Русский", ru: "Русский", uz: "Rus tili", en: "Russian" },
  { value: "Узбекский", ru: "Узбекский", uz: "O'zbek tili", en: "Uzbek" },
  { value: "Английский", ru: "Английский", uz: "Ingliz tili", en: "English" },
] as const;

/** Localize a stored language value (falls back to the raw value if unknown). */
export function localizeLanguage(locale: string, value: string): string {
  const m = LANGUAGES.find((l) => l.value === value);
  return m ? localizedName(locale, m.ru, m.uz, m.en) : value;
}

/** Whole-year age from a YYYY-MM-DD birth date. */
export function ageFromBirthDate(d: string | Date): number {
  const birth = new Date(d);
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000));
}
