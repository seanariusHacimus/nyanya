-- Индексы для админки (2026-09-16). Только CREATE INDEX IF NOT EXISTS: ни одной
-- колонки и ни одной строки не меняет, прежний релиз во время preDeploy их не
-- замечает, повторный запуск — пустая операция. Код разделов админки работает и
-- без этих индексов, они только ускоряют поиск людей по началу адреса и выборку
-- очереди документов.
--
-- Без CONCURRENTLY: мигратор выполняет все новые миграции ОДНОЙ транзакцией, а
-- CREATE INDEX CONCURRENTLY внутри транзакции запрещён. Обычный CREATE INDEX
-- держит SHARE (чтение идёт, запись ждёт) на время построения — на нынешних
-- размерах (десятки строк) это миллисекунды.
--
-- text_pattern_ops обязателен: коллация базы не «C», и обычный btree префиксный
-- LIKE не обслуживает — существующий уникальный user_email_unique для запроса
-- lower(email) like 'q%' бесполезен вдвойне (и выражение другое, и класс операторов).
CREATE INDEX IF NOT EXISTS "documents_pending_created_idx" ON "documents" USING btree ("created_at") WHERE "documents"."status" = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_email_lower_idx" ON "user" USING btree (lower("email") text_pattern_ops);
