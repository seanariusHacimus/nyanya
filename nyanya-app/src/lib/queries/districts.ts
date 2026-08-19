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
