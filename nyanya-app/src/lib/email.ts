import { Resend } from "resend";

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

  const forSpecialist: Block[] = [
    { kind: "text", text: "Аккаунт создан. Чтобы анкета появилась в каталоге, заполните её и пройдите проверку документов." },
    {
      kind: "list",
      items: [
        "Заполните анкету: опыт, образование, район и стоимость",
        "Загрузите документы: паспорт, справку об отсутствии ВИЧ/СПИД, справки из диспансеров и об отсутствии судимости",
        "Отправьте на проверку: обычно занимает 1–2 рабочих дня",
      ],
    },
    { kind: "button", label: "Открыть кабинет", href: `${APP_URL}/specialist` },
    { kind: "note", text: "Документы видят только вы и модератор. В каталоге показывается лишь ваша фотография." },
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
              "Аккаунт создан. Заполните анкету и пройдите проверку документов.",
              `Кабинет: ${APP_URL}/specialist`,
            ]
          : [
              "Аккаунт создан. Каталог проверенных специалистов уже доступен.",
              `Каталог: ${APP_URL}/catalog`,
            ]
      )
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
            "В каталоге у вашей анкеты появится значок «Проверен»",
            "Загрузите рекомендуемые справки, чтобы получить «Премиум-проверен»",
            "Семьи смогут открыть ваши контакты",
            "Если вы замените документ, анкета вернётся на повторную проверку",
          ],
        },
        { kind: "button", label: "Открыть кабинет", href: `${APP_URL}/specialist` },
        { kind: "note", text: "Публикация анкеты в каталоге подтверждается отдельно — об этом придёт уведомление." },
      ]),
      plain(greeting, [
        "Модератор принял все обязательные документы.",
        "После публикации анкета появится в каталоге со значком «Проверен».",
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
}): Promise<void> {
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact);

  await send(
    CONTACT_TO,
    `Обращение с сайта — ${input.name}`,
    shell("Новое обращение с сайта", [
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
    plain("Новое обращение с сайта", [
      `Имя: ${input.name}`,
      `Контакт: ${input.contact}`,
      "",
      input.message,
    ]),
    looksLikeEmail ? input.contact : undefined
  );
}
