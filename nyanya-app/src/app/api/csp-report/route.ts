/**
 * Приёмник отчётов Content-Security-Policy.
 *
 * Политика задаётся в next.config.ts и пока работает в режиме отчёта: браузер
 * ничего не блокирует, а о каждом нарушении присылает сюда POST. Отчёт
 * превращается в одну короткую строку «[csp] {…}» в логе сервиса (Railway) —
 * по этим строкам решается, можно ли переводить политику в боевой режим.
 *
 * Маршрут публичный: браузер шлёт отчёты без сессии. Поэтому он ничего не
 * пишет в базу, не читает тело сверх лимита и ограничивает число строк в
 * минуту на весь процесс — иначе один сломанный плагин или любой желающий с
 * curl заполнил бы лог. Лимит общий, а не по IP: цель — сохранить читаемость
 * лога, а первый адрес x-forwarded-for клиент подставляет сам.
 *
 * Два формата тела:
 * - application/csp-report — директива report-uri (Firefox и старые
 *   браузеры): {"csp-report": {"document-uri": …, "blocked-uri": …}};
 * - application/reports+json — директива report-to, Reporting API (Chrome,
 *   Edge): массив [{type: "csp-violation", url, body: {documentURL, blockedURL, …}}],
 *   приходит пачками с задержкой до минуты.
 */

/** Тело больше этого не читается: отчёт — несколько сотен байт, пачка — единицы КБ. */
const MAX_BODY_BYTES = 64 * 1024;
/** Сколько нарушений из одного запроса попадает в лог. */
const MAX_REPORTS_PER_REQUEST = 20;
/**
 * Сколько строк [csp] процесс пишет за минуту. Сверх лимита отчёты только
 * считаются; их число выводится одной строкой вместе с первым отчётом
 * следующей минуты.
 */
const MAX_LINES_PER_MINUTE = 60;
const MINUTE_MS = 60 * 1000;

const ACCEPTED_TYPES = new Set([
  "application/csp-report",
  "application/reports+json",
  // так report-uri отправляли старые версии браузеров
  "application/json",
]);

/** Нарушения, которые вызывают расширения браузера, а не сайт, — шум. */
const EXTENSION_URL =
  /^(chrome|moz|safari|safari-web|ms-browser)-extension:/i;

let windowStartedAt = 0;
let linesInWindow = 0;
let droppedInWindow = 0;

function takeLogSlot(now: number): boolean {
  if (now - windowStartedAt >= MINUTE_MS) {
    if (droppedInWindow > 0) {
      console.warn(
        `[csp] ${droppedInWindow} reports over the limit of ${MAX_LINES_PER_MINUTE}/min were not logged`
      );
    }
    windowStartedAt = now;
    linesInWindow = 0;
    droppedInWindow = 0;
  }
  if (linesInWindow >= MAX_LINES_PER_MINUTE) {
    droppedInWindow += 1;
    return false;
  }
  linesInWindow += 1;
  return true;
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(source: Json, ...keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

/** Адрес без строки запроса и якоря: в логе не нужны ни параметры, ни личные данные. */
function shortUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  return value.split(/[?#]/)[0].slice(0, 200);
}

function shortText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  return value.slice(0, max);
}

function shortNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

type Violation = {
  doc?: string;
  directive?: string;
  blocked?: string;
  source?: string;
  line?: number;
  column?: number;
  sample?: string;
  mode?: string;
};

/** Приводит отчёт любого из двух форматов к одному виду. */
function toViolation(report: Json, documentUrl?: unknown): Violation {
  return {
    doc: shortUrl(pick(report, "document-uri", "documentURL") ?? documentUrl),
    directive: shortText(
      pick(
        report,
        "effective-directive",
        "effectiveDirective",
        "violated-directive",
        "violatedDirective"
      ),
      60
    ),
    blocked: shortUrl(pick(report, "blocked-uri", "blockedURL")),
    source: shortUrl(pick(report, "source-file", "sourceFile")),
    line: shortNumber(pick(report, "line-number", "lineNumber")),
    column: shortNumber(pick(report, "column-number", "columnNumber")),
    sample: shortText(pick(report, "script-sample", "sample"), 80),
    mode: shortText(pick(report, "disposition"), 10),
  };
}

function extractViolations(payload: unknown): Violation[] {
  // report-to: массив отчётов Reporting API, берём только нарушения CSP
  if (Array.isArray(payload)) {
    return payload
      .filter(
        (entry): entry is Json =>
          isObject(entry) &&
          entry.type === "csp-violation" &&
          isObject(entry.body)
      )
      .map((entry) => toViolation(entry.body as Json, entry.url));
  }
  if (!isObject(payload)) return [];
  // report-uri: {"csp-report": {...}}
  const legacy = payload["csp-report"];
  if (isObject(legacy)) return [toViolation(legacy)];
  return [];
}

/** Читает тело не больше MAX_BODY_BYTES; null — тело больше лимита. */
async function readLimitedBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request) {
  const mediaType = (request.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ACCEPTED_TYPES.has(mediaType)) {
    return new Response(null, { status: 415 });
  }

  const text = await readLimitedBody(request);
  if (text === null) return new Response(null, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const now = Date.now();
  const violations = extractViolations(payload).slice(
    0,
    MAX_REPORTS_PER_REQUEST
  );
  for (const violation of violations) {
    if (
      EXTENSION_URL.test(violation.blocked ?? "") ||
      EXTENSION_URL.test(violation.source ?? "")
    ) {
      continue;
    }
    if (!takeLogSlot(now)) continue;
    console.warn("[csp]", JSON.stringify(violation));
  }

  return new Response(null, { status: 204 });
}
