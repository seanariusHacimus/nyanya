import { createEskizSender, readEskizConfig } from "./eskiz";
import { InvalidPhoneError, normalizePhone } from "./phone";
import { SmsError, type SmsMessage, type SmsSendResult, type SmsSender } from "./types";

export { InvalidPhoneError, SmsError, normalizePhone };
export { formatPhone, isCanonicalPhone, isValidPhone } from "./phone";
export type { SmsMessage, SmsSendResult, SmsSender };

/**
 * Отправка SMS. Провайдер выбирается так же, как хранилище документов:
 * есть настройки — работаем через шлюз, нет — пишем в лог и никуда не идём.
 *
 * Это и есть выключатель. Без `ESKIZ_EMAIL` и `ESKIZ_SECRET` приложение ведёт
 * себя ровно как до появления SMS: код печатается в консоль сервера, наружу
 * ничего не уходит, разработка не блокируется, счёт не тратится.
 *
 * Если провайдер задан явно, а ключей нет — падаем с внятной ошибкой, а не
 * молча уходим в мок: «включил, но SMS не приходят» должно быть видно сразу.
 */

function createMockSender(): SmsSender {
  return {
    async send(message: SmsMessage): Promise<SmsSendResult> {
      const to = normalizePhone(message.to);
      console.info(`[sms:mock] → ${to}: ${message.text}`);
      return { id: null, to, provider: "mock" };
    },
  };
}

let sender: SmsSender | null = null;

function getSender(): SmsSender {
  if (sender) return sender;

  const eskiz = readEskizConfig();
  const provider = process.env.SMS_PROVIDER ?? (eskiz ? "eskiz" : "mock");

  if (provider === "eskiz") {
    if (!eskiz) {
      throw new Error(
        "SMS_PROVIDER=eskiz, но не заданы ESKIZ_EMAIL / ESKIZ_SECRET " +
          "(секретный ключ из кабинета Eskiz: Смс → Смс шлюз, не пароль от кабинета)"
      );
    }
    sender = createEskizSender(eskiz);
  } else {
    sender = createMockSender();
  }

  return sender;
}

/** Правда ли SMS уходят наружу — для подсказок в интерфейсе и в логах. */
export function smsEnabled(): boolean {
  return (process.env.SMS_PROVIDER ?? (readEskizConfig() ? "eskiz" : "mock")) !== "mock";
}

export async function sendSms(message: SmsMessage): Promise<SmsSendResult> {
  return getSender().send(message);
}

/**
 * Код подтверждения.
 *
 * Текст держим в одном сегменте: кириллица — 70 знаков на SMS, 71-й
 * удваивает цену. Название сайта стоит первым словом намеренно — пока нет
 * альфа-имени, сообщение приходит с безликого короткого номера, и человек
 * должен понять, откуда код, не открывая сайт.
 *
 * Текст обязан совпадать с шаблоном, утверждённым модерацией Eskiz: они
 * требуют заново утверждать шаблон при изменении даже одного символа.
 */
export function otpSmsText(code: string): string {
  return `nyanya.uz: код ${code}. Никому не сообщайте его.`;
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  await sendSms({ to: phone, text: otpSmsText(code) });
}
