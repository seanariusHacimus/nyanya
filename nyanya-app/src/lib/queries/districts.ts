import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { districts } from "@/db/schema";

/**
 * Справочник районов для выбора в анкете.
 *
 * Сервис работает по Ташкенту, но в таблице лежат ещё районы Самарканда и
 * Бухары — остатки от заготовки на другие города. Выпадающий список показывал
 * их вперемешку и без названия города, из-за чего «Центр» встречался дважды и
 * люди выбирали его наугад: две опубликованные анкеты в итоге числились в
 * Бухаре.
 *
 * Поэтому выбор ограничен Ташкентом. Сами строки других городов НЕ удалены:
 * на них уже ссылаются анкеты, и удаление увело бы их в никуда. Когда сервис
 * пойдёт в другие города, сюда добавится параметр города — а не снимется
 * фильтр.
 */

/** Ташкент. Единственный город, по которому сервис работает сегодня. */
export const TASHKENT_CITY_ID = 1;

export type DistrictOption = { id: number; name: string };

export async function getDistrictOptions(): Promise<DistrictOption[]> {
  return db
    .select({ id: districts.id, name: districts.nameRu })
    .from(districts)
    .where(eq(districts.cityId, TASHKENT_CITY_ID))
    .orderBy(asc(districts.nameRu));
}

/**
 * Районы для фильтра каталога: к названию добавляется латинский токен для
 * адреса. Русское название в URL превращается в `%D0%A7%D0%B8…`, и такой
 * ссылкой неудобно делиться, поэтому в адресе живёт `name_en` строчными с
 * дефисом вместо пробела: chilanzar, mirzo-ulugbek, shaykhantakhur.
 *
 * Список приходит из базы, а не из массива в клиентском компоненте: тот
 * дублировал справочник и молча расходился с ним.
 */
export type CatalogDistrict = { id: number; name: string; token: string };

export async function getCatalogDistricts(): Promise<CatalogDistrict[]> {
  const rows = await db
    .select({
      id: districts.id,
      name: districts.nameRu,
      nameEn: districts.nameEn,
    })
    .from(districts)
    .where(eq(districts.cityId, TASHKENT_CITY_ID))
    .orderBy(asc(districts.nameRu));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    token: r.nameEn.toLowerCase().replace(/\s+/g, "-"),
  }));
}
