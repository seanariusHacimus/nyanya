/**
 * Приведение узбекского номера к виду, который принимает шлюз.
 *
 * Eskiz в примере запроса показывает `998991234567` — двенадцать цифр без
 * плюса. Формальной спецификации формата у них нет (в их же сохранённом
 * примере ответа стоит четырнадцатизначное число), поэтому ориентируемся на
 * пример запроса и проверяем результат сами, а не надеемся на шлюз.
 *
 * Люди пишут номер как угодно: «+998 90 123-45-67», «90 123 45 67»,
 * «8 90 1234567». Все три означают одно и то же, и все три должны дойти.
 */

/** Коды операторов Узбекистана — из сообщения об ошибке Eskiz. */
const OPERATOR_CODES = [
  "33", // Humans
  "77", // UzMobile
  "88", // MobiUz
  "90", // Beeline
  "91", // Beeline
  "93", // Ucell
  "94", // Ucell
  "95", // UzMobile
  "97", // MobiUz
  "98", // Perfectum
  "99", // UzMobile
] as const;

export class InvalidPhoneError extends Error {
  constructor(raw: string) {
    super(`не похоже на узбекский номер: ${raw}`);
    this.name = "InvalidPhoneError";
  }
}

/**
 * Возвращает номер в виде `998XXXXXXXXX` (12 цифр) либо бросает
 * `InvalidPhoneError`. Ведущая восьмёрка — привычка из старой нумерации,
 * её отбрасываем: «8 90 …» и «90 …» — один и тот же номер.
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  // Код страны срезаем только по длине. Иначе «99 812-34-56» (оператор 99,
  // абонент 8123456) выглядит начинающимся с «998» и теряет три цифры —
  // валидный номер отвергался в национальной записи и принимался в
  // международной.
  if (digits.length > 9 && digits.startsWith("998")) digits = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("8")) digits = digits.slice(1);

  if (digits.length !== 9) throw new InvalidPhoneError(raw);
  if (!(OPERATOR_CODES as readonly string[]).includes(digits.slice(0, 2))) {
    throw new InvalidPhoneError(raw);
  }

  return `998${digits}`;
}

/**
 * Номер уже приведён к каноническому виду.
 *
 * Нужно там, где значение попадает в базу: Better Auth хранит номер ровно
 * таким, каким его прислали, и проверяет занятость номера сравнением строк.
 * Если пустить и «+998 90 …», и «998…», один человек станет двумя, а проверка
 * занятости перестанет работать. Поэтому на границе принимаем только канон,
 * а приводит к нему тот, кто ближе к пользователю, — форма.
 */
export function isCanonicalPhone(value: string): boolean {
  try {
    return normalizePhone(value) === value;
  } catch {
    return false;
  }
}

/** Проверка без исключения — для валидации формы. */
export function isValidPhone(raw: string): boolean {
  try {
    normalizePhone(raw);
    return true;
  } catch {
    return false;
  }
}

/** Читаемый вид для интерфейса: `+998 90 123-45-67`. */
export function formatPhone(raw: string): string {
  const n = normalizePhone(raw);
  return `+${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 8)}-${n.slice(
    8,
    10
  )}-${n.slice(10)}`;
}
