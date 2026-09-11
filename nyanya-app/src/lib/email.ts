import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import { PREMIUM_BENEFITS } from "@/lib/specialists-shared";

/**
 * Письма сервиса.
 *
 * Вёрстка табличная с инлайновыми стилями — почтовые клиенты не понимают
 * ни flex, ни внешних стилей. Georgia вместо Playfair: подключать шрифт в
 * письме нельзя, а Georgia есть везде и близка по духу.
 *
 * Провайдер один — Resend. Без ключа письма не уходят, а содержимое
 * печатается в лог: разработка не блокируется отсутствием почты.
 */

const FROM = process.env.EMAIL_FROM ?? "nyanya.uz <onboarding@resend.dev>";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://nyanya-production.up.railway.app";

/* ------------------------------ палитра ------------------------------ */

const C = {
  bg: "#f2efe9",
  card: "#fbfaf7",
  line: "#dbd5c8",
  ink: "#211f1a",
  soft: "#5d584e",
  faint: "#8a8478",
  bronze: "#96733a",
} as const;

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";

/* ------------------------------ каркас ------------------------------- */

type Block =
  | { kind: "text"; text: string }
  | { kind: "code"; code: string }
  | { kind: "note"; text: string }
  /** Список «что дальше» — маркеры рисуем символом, а не <ul> */
  | { kind: "list"; items: string[] }
  | { kind: "button"; label: string; href: string };

function renderBlock(b: Block): string {
  switch (b.kind) {
    case "text":
      return `<p style="margin:0 0 16px;font-family:${SANS};font-size:14px;line-height:1.65;color:${C.soft};">${b.text}</p>`;
    case "code":
      return `<div style="font-family:${SERIF};font-size:36px;letter-spacing:12px;color:${C.ink};padding:16px 0 20px;margin:8px 0 4px;border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};">${b.code}</div>`;
    case "note":
      return `<p style="margin:20px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.faint};">${b.text}</p>`;
    case "list":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tbody>${b.items
        .map(
          (i) =>
            `<tr><td style="padding:0 8px 8px 0;font-family:${SANS};font-size:14px;color:${C.bronze};line-height:1.65;">&bull;</td><td style="padding:0 0 8px;font-family:${SANS};font-size:14px;line-height:1.65;color:${C.soft};">${i}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 4px;"><tbody><tr><td style="background-color:${C.ink};">
        <a href="${b.href}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${C.bg};text-decoration:none;">${b.label}</a>
      </td></tr></tbody></table>`;
  }
}

/** Общая оболочка всех писем: шапка с логотипом, карточка, подпись. */
function shell(heading: string, blocks: Block[]): string {
  return `<!doctype html>
<html lang="ru">
<body style="margin:0;padding:0;background-color:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.bg};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <div style="font-family:${SERIF};font-size:22px;letter-spacing:2px;font-weight:600;color:${C.ink};">nyanya.uz</div>
          <div style="font-family:${SERIF};font-size:15px;color:${C.bronze};padding-top:6px;">жизнь без забот</div>
        </td></tr>
        <tr><td style="background-color:${C.card};border:1px solid ${C.line};padding:36px 32px;" align="center">
          <div style="font-family:${SERIF};font-size:22px;line-height:1.35;color:${C.ink};padding-bottom:16px;">${heading}</div>
          ${blocks.map(renderBlock).join("\n          ")}
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <div style="font-family:${SANS};font-size:11px;line-height:1.6;color:${C.faint};">
            nyanya.uz — премиальная платформа по поиску домашнего персонала.<br>Ташкент, Узбекистан
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Текстовая версия — обязательна, иначе письмо чаще уходит в спам. */
function plain(heading: string, lines: string[]): string {
  return [
    "nyanya.uz — жизнь без забот",
    "",
    heading,
    "",
    ...lines,
    "",
    "nyanya.uz — премиальная платформа по поиску домашнего персонала.",
  ].join("\n");
}

/* ------------------------------ отправка ----------------------------- */

async function send(
  to: string,
  subject: string,
  html: string,
  text: string,
  replyTo?: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(`[email:mock] «${subject}» → ${to}`);
    // без ключа письмо можно сохранить в файл и открыть в браузере —
    // иначе вёрстку не проверить, пока не дойдёт до настоящей отправки
    const dumpDir = process.env.EMAIL_DUMP_DIR;
    if (dumpDir) {
      const safe = subject.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60);
      fs.mkdirSync(dumpDir, { recursive: true });
      fs.writeFileSync(path.join(dumpDir, `${Date.now()}-${safe}.html`), html);
    }
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    console.error("[email] resend error:", error);
    throw new Error("email_send_failed");
  }
}

/**
 * Письма о событиях (регистрация, проверка документов) не должны ронять
 * действие, которое их вызвало: аккаунт создан и документы приняты
 * независимо от того, дошло письмо или нет.
 */
async function sendQuietly(
  label: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[email] не удалось отправить «${label}»:`, error);
  }
}

/* ------------------------------ письма ------------------------------- */

/** Код подтверждения для входа. */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await send(
    to,
    `${code} — код подтверждения nyanya.uz`,
    shell("Код подтверждения", [
      { kind: "text", text: "Введите этот код на сайте, чтобы продолжить. Код действует 10 минут." },
      { kind: "code", code },
      { kind: "note", text: "Если вы не запрашивали код — просто проигнорируйте это письмо." },
    ]),
    plain("Код подтверждения", [
      `Код: ${code}`,
      "Код действует 10 минут.",
      "Если вы не запрашивали код — проигнорируйте это письмо.",
    ])
  );
}

/**
 * Код для восстановления пароля.
 *
 * Отдельное письмо, а не общий «код подтверждения»: человек, который получил
 * код, не просил его — и должен по первой строке понять, что кто-то пытается
 * сменить ему пароль. Важно и обратное: если он ничего не делал, письмо обязано
 * сказать, что бездействие безопасно и пароль останется прежним.
 */
export async function sendPasswordResetOtpEmail(
  to: string,
  code: string
): Promise<void> {
  await send(
    to,
    `${code} — восстановление пароля nyanya.uz`,
    shell("Восстановление пароля", [
      {
        kind: "text",
        text: "Введите этот код на сайте, чтобы задать новый пароль. Код действует 10 минут.",
      },
      { kind: "code", code },
      {
        kind: "note",
        text: "Если вы не запрашивали восстановление — просто удалите это письмо. Пароль останется прежним, менять его не нужно.",
      },
    ]),
    plain("Восстановление пароля", [
      `Код: ${code}`,
      "Введите его на сайте, чтобы задать новый пароль. Код действует 10 минут.",
      "Если вы не запрашивали восстановление — удалите это письмо, пароль останется прежним.",
    ])
  );
}

/**
 * Блок про премиум для писем специалисту. Слова те же, что на плашке в
 * кабинете и на странице документов: PREMIUM_BENEFITS — единственный источник.
 */
function premiumBlocks(): Block[] {
  return [
    {
      kind: "text",
      text: "<b>Премиум-профиль.</b> После отправки анкеты предоставьте паспорт и справки — модератор проверит их, и анкета получит то, чего нет у стандартной:",
    },
    {
      kind: "list",
      items: PREMIUM_BENEFITS.map((b) => `<b>${b.title}</b> — ${b.text}`),
    },
    { kind: "button", label: "Документы для премиума", href: `${APP_URL}/specialist/premium` },
  ];
}

/** Приветствие после успешной регистрации. Текст зависит от роли. */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: "parent" | "specialist"
): Promise<void> {
  const greeting = name ? `${name}, добро пожаловать!` : "Добро пожаловать!";

  const forParent: Block[] = [
    { kind: "text", text: "Аккаунт создан. Теперь вам доступен каталог специалистов, прошедших проверку документов." },
    {
      kind: "list",
      items: [
        "Подбирайте по категории, району, опыту и стоимости",
        "Сохраняйте понравившиеся анкеты в избранное",
        "Открывайте контакты — телефон специалиста",
      ],
    },
    { kind: "button", label: "Перейти в каталог", href: `${APP_URL}/catalog` },
    { kind: "note", text: "Открытые контакты сохраняются в личном кабинете — возвращаться к поиску не придётся." },
  ];

  /**
   * Специалисту — про то, что осталось на самом деле: пять экранов и
   * фотография. Прежний текст перечислял паспорт и справки как обязательный
   * шаг, хотя для публикации они не нужны, и человек уходил их собирать.
   */
  const forSpecialist: Block[] = [
    {
      kind: "text",
      text: "Аккаунт создан. Осталась анкета: пять экранов и фотография, около пяти минут. Отправите на проверку — модератор посмотрит её за 1–2 рабочих дня, и анкета появится в каталоге.",
    },
    { kind: "button", label: "Продолжить анкету", href: `${APP_URL}/specialist?anketa=1` },
    { kind: "note", text: "Всё, что вы заполнили, сохраняется на каждом шаге — вернуться можно в любой момент." },
    ...premiumBlocks(),
  ];

  await sendQuietly("регистрация", () =>
    send(
      to,
      "Добро пожаловать в nyanya.uz",
      shell(greeting, role === "specialist" ? forSpecialist : forParent),
      plain(
        greeting,
        role === "specialist"
          ? [
              "Аккаунт создан. Осталась анкета: пять экранов и фотография, около пяти минут.",
              `Продолжить анкету: ${APP_URL}/specialist?anketa=1`,
              "",
              "Премиум-профиль: после отправки анкеты предоставьте паспорт и справки.",
              ...PREMIUM_BENEFITS.map((b) => `— ${b.title}: ${b.text}`),
              `Документы для премиума: ${APP_URL}/specialist/premium`,
            ]
          : [
              "Аккаунт создан. Каталог специалистов уже доступен.",
              `Каталог: ${APP_URL}/catalog`,
            ]
      )
    )
  );
}

/**
 * Анкета отправлена на модерацию.
 *
 * Уведомление внутри кабинета человек увидит, только если сам туда вернётся, —
 * а он в этот момент как раз закрывает сайт и уходит ждать. Письмо доходит до
 * него там, где он есть, и отвечает на единственный вопрос: сколько ждать.
 */
export async function sendProfileSubmittedEmail(
  to: string,
  name: string
): Promise<void> {
  const greeting = name ? `${name}, анкета принята` : "Анкета принята";

  await sendQuietly("отправка на модерацию", () =>
    send(
      to,
      "Анкета принята и находится на модерации — nyanya.uz",
      shell(greeting, [
        {
          kind: "text",
          text: "Поздравляем! Ваша анкета принята и сейчас находится на модерации.",
        },
        {
          kind: "list",
          items: [
            "Проверка обычно занимает 1–2 рабочих дня",
            "Когда анкета будет опубликована, мы пришлём ещё одно письмо",
            "Пока идёт проверка, анкету можно дополнять — например, догрузить справки",
          ],
        },
        { kind: "button", label: "Открыть кабинет", href: `${APP_URL}/specialist` },
      ]),
      plain(greeting, [
        "Ваша анкета принята и сейчас находится на модерации.",
        "Проверка обычно занимает 1–2 рабочих дня. О публикации сообщим отдельным письмом.",
        `Кабинет: ${APP_URL}/specialist`,
      ])
    )
  );
}

/**
 * Анкета прошла модерацию и появилась в каталоге.
 *
 * Стандартному профилю письмо заодно предлагает премиум: момент публикации —
 * лучший для этого разговора, человек только что получил результат.
 */
export async function sendProfilePublishedEmail(
  to: string,
  name: string,
  slug: string | null,
  tier: "standard" | "premium"
): Promise<void> {
  const greeting = name
    ? `${name}, ваша анкета опубликована`
    : "Ваша анкета опубликована";

  const profileHref = slug ? `${APP_URL}/specialists/${slug}` : `${APP_URL}/specialist`;

  await sendQuietly("публикация анкеты", () =>
    send(
      to,
      "Ваша анкета опубликована на сайте — nyanya.uz",
      shell(greeting, [
        {
          kind: "text",
          text: "Ваша анкета опубликована на сайте и видна семьям в каталоге.",
        },
        {
          kind: "list",
          items: [
            "Семьи находят вас по категории, району, опыту и стоимости",
            "Открыв контакты, семья звонит вам напрямую — держите телефон под рукой",
            "Если работа уже найдена, показ анкеты можно приостановить в кабинете",
          ],
        },
        { kind: "button", label: slug ? "Смотреть анкету" : "Открыть кабинет", href: profileHref },
        ...(tier === "standard" ? premiumBlocks() : []),
      ]),
      plain(greeting, [
        "Ваша анкета опубликована на сайте и видна семьям в каталоге.",
        `Анкета: ${profileHref}`,
        ...(tier === "standard"
          ? [
              "",
              "Премиум-профиль: предоставьте паспорт и справки.",
              ...PREMIUM_BENEFITS.map((b) => `— ${b.title}: ${b.text}`),
              `Документы для премиума: ${APP_URL}/specialist/premium`,
            ]
          : []),
      ])
    )
  );
}

/** Приняты все обязательные документы — анкету можно публиковать. */
export async function sendDocumentsApprovedEmail(
  to: string,
  name: string
): Promise<void> {
  const greeting = name ? `${name}, документы проверены` : "Документы проверены";

  await sendQuietly("проверка документов", () =>
    send(
      to,
      "Документы проверены — nyanya.uz",
      shell(greeting, [
        { kind: "text", text: "Модератор принял все обязательные документы. Проверка пройдена." },
        {
          kind: "list",
          items: [
            "В каталоге у вашей анкеты появится отметка «Премиум-профиль»",
            "Это высший статус — он говорит семьям, что ваши документы проверены",
            "Семьи смогут открыть ваши контакты",
            "Если вы замените документ, анкета вернётся на повторную проверку",
          ],
        },
        { kind: "button", label: "Открыть кабинет", href: `${APP_URL}/specialist` },
        { kind: "note", text: "Публикация анкеты в каталоге подтверждается отдельно — об этом придёт уведомление." },
      ]),
      plain(greeting, [
        "Модератор принял все обязательные документы.",
        "После публикации анкета появится в каталоге с отметкой «Премиум-профиль».",
        `Кабинет: ${APP_URL}/specialist`,
      ])
    )
  );
}

/** Куда приходят обращения с формы обратной связи. */
const CONTACT_TO = process.env.CONTACT_EMAIL_TO ?? "shokhedu@gmail.com";

/** Экранирование пользовательского текста перед вставкой в HTML письма. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Обращение с формы обратной связи — владельцу на почту.
 *
 * Если посетитель оставил адрес электронной почты, он подставляется в
 * `replyTo`: ответить можно прямо из почтового клиента, не копируя контакт
 * руками. Ошибку отправки здесь НЕ глушим — посетителю нужно честно сказать,
 * что сообщение не ушло, иначе он будет ждать ответа впустую.
 */
export async function sendContactMessage(input: {
  name: string;
  contact: string;
  message: string;
  /** Оценка сервиса 1–5; null — человек её не ставил. */
  rating?: number | null;
}): Promise<void> {
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact);
  // оценка выносится в тему: по списку писем сразу видно, где недовольство
  const stars = input.rating
    ? `${"★".repeat(input.rating)}${"☆".repeat(5 - input.rating)}`
    : null;

  await send(
    CONTACT_TO,
    stars
      ? `Отзыв о сервисе ${input.rating}/5 — ${input.name}`
      : `Обращение с сайта — ${input.name}`,
    shell(stars ? "Отзыв о сервисе" : "Новое обращение с сайта", [
      ...(stars
        ? [{ kind: "text" as const, text: `<b>Оценка:</b> ${stars} (${input.rating} из 5)` }]
        : []),
      { kind: "text", text: `<b>Имя:</b> ${escapeHtml(input.name)}` },
      { kind: "text", text: `<b>Контакт:</b> ${escapeHtml(input.contact)}` },
      {
        kind: "text",
        text: escapeHtml(input.message).replace(/\n/g, "<br>"),
      },
      {
        kind: "note",
        text: looksLikeEmail
          ? "Ответьте на это письмо — ответ уйдёт прямо посетителю."
          : "Контакт указан не почтой — ответьте способом, который указал посетитель.",
      },
    ]),
    plain(stars ? "Отзыв о сервисе" : "Новое обращение с сайта", [
      ...(input.rating ? [`Оценка: ${input.rating} из 5`] : []),
      `Имя: ${input.name}`,
      `Контакт: ${input.contact}`,
      "",
      input.message,
    ]),
    looksLikeEmail ? input.contact : undefined
  );
}
