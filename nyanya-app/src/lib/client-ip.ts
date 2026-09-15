import type { BetterAuthAdvancedOptions } from "better-auth";
import { getIp } from "better-auth/api";

type IpAddressOptions = NonNullable<BetterAuthAdvancedOptions["ipAddress"]>;

/**
 * Как определяется IP клиента — одна настройка на Better Auth и на собственные
 * маршруты (форма обратной связи). Better Auth получает её в `advanced.ipAddress`,
 * `clientIpFromHeaders` ниже читает её же, поэтому лимит входа, блокировка по
 * почте и лимит формы всегда говорят об одном и том же адресе.
 *
 * Без списка доверенных прокси ограничение частоты не работает как задумано.
 * Better Auth читает X-Forwarded-For, но без этого списка принимает заголовок
 * только с одним адресом. Railway терминирует TLS на своём edge и дописывает
 * собственный хоп, адресов становится больше одного — IP не определялся, и все
 * клиенты попадали в одну общую корзину лимитов на путь.
 *
 * Разбор идёт справа налево, внутренние адреса пропускаются, первым
 * недоверенным оказывается реальный клиент. Левый край заголовка присылает сам
 * клиент, поэтому брать первый элемент X-Forwarded-For нельзя: подставив туда
 * новый адрес, можно было бы получать свежий счётчик на каждый запрос. Значение,
 * дописанное edge последним, клиент не контролирует.
 */
export const IP_ADDRESS_OPTIONS: IpAddressOptions = {
  trustedProxies: [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "127.0.0.0/8",
    "::1/128",
    "fd00::/8",
  ],
};

/**
 * IP клиента для собственных маршрутов — тем же `getIp`, что у Better Auth.
 *
 * null — адрес определить нельзя: заголовка нет или вся цепочка из доверенных
 * хопов (локальный `next start` без X-Forwarded-For). В `NODE_ENV=development`
 * `getIp` вместо null отдаёт 127.0.0.1. Не разбирать X-Forwarded-For руками.
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  return getIp(headers, { advanced: { ipAddress: IP_ADDRESS_OPTIONS } });
}
