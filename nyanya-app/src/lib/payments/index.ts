/**
 * Оплата доступа к контактам специалиста.
 *
 * Провайдер выбирается переменной `PAYMENT_PROVIDER`. Сейчас доступен только
 * `mock`: платёж подтверждается сразу, без похода в банк. Это не заглушка
 * «на будущее» — вся остальная логика настоящая: создаётся запись в
 * `payments`, открытие контактов ссылается на неё через `payment_id`, и без
 * оплаченного платежа контакты не открываются.
 *
 * Когда появится Payme, Click или Uzum, добавляется файл рядом и строка в
 * `resolveProvider` — вызывающий код не меняется. Реальный провайдер вернёт
 * `status: "redirect"` со ссылкой на платёжную форму, а подтверждение придёт
 * отдельным вебхуком, который проставит платежу `paid` и создаст открытие.
 */

export type PaymentPurpose = "contact_unlock" | "specialist_listing";

export type PaymentIntent =
  /** Провайдер подтвердил оплату сразу — можно открывать контакты. */
  | { status: "paid"; providerTxnId: string }
  /** Нужно увести пользователя на платёжную форму. */
  | { status: "redirect"; providerTxnId: string; redirectUrl: string }
  | { status: "failed"; reason: string };

export type CreatePaymentInput = {
  amount: number;
  currency: string;
  purpose: PaymentPurpose;
  /** Наш идентификатор платежа — уходит провайдеру как номер заказа. */
  orderId: string;
  description: string;
};

export interface PaymentProvider {
  readonly name: "mock" | "payme" | "click" | "uzum";
  createPayment(input: CreatePaymentInput): Promise<PaymentIntent>;
}

/** Провайдер-заглушка: подтверждает оплату немедленно. */
const mockProvider: PaymentProvider = {
  name: "mock",
  async createPayment(input) {
    return { status: "paid", providerTxnId: `mock_${input.orderId}` };
  },
};

export function resolveProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  switch (name) {
    case "mock":
      return mockProvider;
    default:
      // Явная ошибка лучше тихого отката на mock: иначе на проде можно
      // случайно раздавать контакты бесплатно, думая, что берёшь деньги.
      throw new Error(
        `PAYMENT_PROVIDER=${name} не реализован. Доступен только "mock".`
      );
  }
}

/** Стоимость открытия контактов, сум. */
export function unlockFee(): number {
  const raw = Number(process.env.UNLOCK_FEE_UZS);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 29000;
}

export function formatUzs(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} сум`;
}
