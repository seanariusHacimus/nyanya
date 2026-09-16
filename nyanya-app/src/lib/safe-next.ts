/**
 * Адрес возврата после входа (`?next=`) принимается только как путь этого сайта.
 *
 * Раньше проверка была `next.startsWith("/")`, и ей удовлетворяло `//evil.com`:
 * браузер считает такой адрес другим источником, и Next делает полный переход
 * на чужой сайт — после настоящего входа на настоящем nyanya.uz человек
 * оказывался на поддельной странице (аудит 2026-09-14).
 *
 * Префиксной проверки мало: `new URL("/a/..//evil.com", base)` схлопывает
 * `..`, превращает `\` в `/` и даёт путь `//evil.com` при неизменном
 * источнике. Поэтому решающая проверка стоит ПОСЛЕ разбора и смотрит на
 * итоговый путь. Разбор против фиктивного источника: результат зависит только
 * от строки, одинаково на сервере и в браузере.
 */
const AUTH_PAGES = ["/login", "/register", "/reset-password"];

export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2000 || !raw.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(raw, "http://nyanya.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "http://nyanya.invalid") return null;
  const path = url.pathname + url.search;
  // итоговый путь: ровно одна косая в начале, за ней не косая и не обратная
  if (!/^\/(?![/\\])/.test(path)) return null;
  // не возвращать человека на страницы входа — иначе круг
  if (AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`))) {
    return null;
  }
  return path;
}
