/**
 * Контракт отправки SMS.
 *
 * Интерфейс намеренно узкий — одна операция. Провайдер выбирается
 * переменной `SMS_PROVIDER` (`eskiz` · `mock`), вызывающий код о нём не знает,
 * ровно как в `lib/storage`.
 */

export type SmsMessage = {
  /** Номер получателя в любом виде — провайдер приводит его к своему формату. */
  to: string;
  text: string;
};

export interface SmsSender {
  /** Отправляет сообщение. Бросает `SmsError`, если провайдер отказал. */
  send(message: SmsMessage): Promise<SmsSendResult>;
}

export type SmsSendResult = {
  /** Идентификатор сообщения у провайдера — по нему проверяется доставка. */
  id: string | null;
  /** Куда фактически ушло: нормализованный номер. */
  to: string;
  provider: string;
};

/**
 * Провайдер отказал. Отделён от сетевых сбоев, чтобы вызывающий код мог
 * отличить «неверный номер» от «шлюз недоступен» и не сжигать попытки.
 */
export class SmsError extends Error {
  readonly status: number | null;
  readonly payload: unknown;

  constructor(message: string, status: number | null = null, payload?: unknown) {
    super(message);
    this.name = "SmsError";
    this.status = status;
    this.payload = payload;
  }
}
