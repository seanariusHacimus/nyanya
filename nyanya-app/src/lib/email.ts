import { Resend } from "resend";

/**
 * Отправка писем. Provider-паттерн старого приложения: если RESEND_API_KEY
 * не задан — dev-mock, код печатается в лог сервера, разработка не блокируется.
 */

const FROM = process.env.EMAIL_FROM ?? "NYANYA.UZ <onboarding@resend.dev>";

/** Фирменное OTP-письмо в дизайн-системе (табличная вёрстка, inline-CSS,
 *  Georgia как почтовый серокорпусный аналог Playfair). */
function renderOtpEmail(code: string): { html: string; text: string } {
  const html = `<!doctype html>
<html lang="ru">
<body style="margin:0;padding:0;background-color:#f2efe9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2efe9;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:2px;font-weight:600;color:#211f1a;">NYANYA.UZ</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#96733a;padding-top:6px;">Жизнь без забот</div>
        </td></tr>
        <tr><td style="background-color:#fbfaf7;border:1px solid #dbd5c8;padding:36px 32px;" align="center">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#211f1a;padding-bottom:12px;">Код подтверждения</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#5d584e;padding-bottom:24px;">
            Введите этот код на сайте, чтобы продолжить. Код действует 5 минут.
          </div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;letter-spacing:12px;color:#211f1a;padding:16px 0 20px;border-top:1px solid #dbd5c8;border-bottom:1px solid #dbd5c8;">${code}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8478;padding-top:20px;">
            Если вы не запрашивали код — просто проигнорируйте это письмо.
          </div>
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#8a8478;">
            nyanya.uz — премиальный сервис по подбору специалистов для вашей семьи.<br>Ташкент, Узбекистан
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `NYANYA.UZ — жизнь без забот

Код подтверждения: ${code}

Введите этот код на сайте, чтобы продолжить. Код действует 5 минут.
Если вы не запрашивали код — проигнорируйте это письмо.`;

  return { html, text };
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // dev-mock: без ключа Resend код виден в логе сервера
    console.info(`[email:mock] OTP для ${to}: ${code}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { html, text } = renderOtpEmail(code);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${code} — код подтверждения NYANYA.UZ`,
    html,
    text,
  });

  if (error) {
    console.error("[email] resend error:", error);
    throw new Error("email_send_failed");
  }
}
