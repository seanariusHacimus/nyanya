/**
 * ЧПУ-адрес анкеты. Имена в базе кириллические, адрес каталога — латиница,
 * поэтому нужна транслитерация, а не просто «пробелы в дефисы».
 */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
  // узбекская кириллица
  ў: "u", қ: "q", ғ: "g", ҳ: "h",
};

/** «Нилюфар Каримова» → «nilufar-karimova». Пустая строка, если знаков не осталось. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // диакритика латиницы: é → e
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Свободный адрес на основе имени. `isTaken` спрашивает базу — уникальность
 * колонки всё равно остаётся последней защитой при гонке.
 */
export async function uniqueSlug(
  name: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(name) || "specialist";
  if (!(await isTaken(base))) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // практически недостижимо; лучше уникальный хвост, чем отказ публикации
  return `${base}-${Date.now().toString(36)}`;
}
