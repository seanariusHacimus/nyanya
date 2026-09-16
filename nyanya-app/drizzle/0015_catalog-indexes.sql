-- Индексы каталога (2026-09-16). Только CREATE INDEX IF NOT EXISTS: ни одной
-- колонки и ни одной строки не меняет, прежний релиз во время preDeploy их не
-- замечает, повторный запуск — пустая операция. Каталог работает и без них,
-- индексы только убирают полный скан из выдачи и из счётчика «Найдено».
--
-- Частичный предикат совпадает с listedInCatalog в src/lib/queries/specialists.ts,
-- порядок колонок первого индекса — с CATALOG_ORDER оттуда же.
--
-- DESC NULLS FIRST, а не NULLS LAST по умолчанию drizzle: `order by x desc` в
-- Postgres означает NULLS FIRST, и порядок в индексе обязан совпасть с
-- порядком в запросе, иначе планировщик индекс для сортировки не возьмёт.
--
-- Без CONCURRENTLY: мигратор выполняет все новые миграции ОДНОЙ транзакцией, а
-- CREATE INDEX CONCURRENTLY внутри транзакции запрещён. Обычный CREATE INDEX
-- держит SHARE (чтение идёт, запись ждёт) на время построения — на нынешних
-- двух десятках анкет это миллисекунды.
CREATE INDEX IF NOT EXISTS "specialist_catalog_order_idx" ON "specialist_profiles" USING btree ("verification_level" DESC NULLS FIRST,"rating_avg" DESC NULLS FIRST,"review_count" DESC NULLS FIRST,"published_at" DESC NULLS FIRST,"id") WHERE "specialist_profiles"."status" = 'active' AND "specialist_profiles"."employed" = false AND "specialist_profiles"."slug" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "specialist_catalog_filter_idx" ON "specialist_profiles" USING btree ("category","district_id") WHERE "specialist_profiles"."status" = 'active' AND "specialist_profiles"."employed" = false AND "specialist_profiles"."slug" IS NOT NULL;
