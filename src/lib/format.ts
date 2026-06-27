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

/** Whole-year age from a YYYY-MM-DD birth date. */
export function ageFromBirthDate(d: string | Date): number {
  const birth = new Date(d);
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000));
}
