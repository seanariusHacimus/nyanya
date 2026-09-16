-- Лимит открытий контактов (2026-09-16): отметка для ручного разбора на пользователе и индекс
-- для подсчёта открытий аккаунта за 24 часа. Только добавление — колонки nullable без default
-- (существующие строки не переписываются), прежняя версия кода их не читает; повторный запуск
-- ничего не меняет. Без CONCURRENTLY: мигратор выполняет все файлы в одной транзакции.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "flagged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "flag_reason" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_unlocks_parent_unlocked_at_idx" ON "contact_unlocks" USING btree ("parent_id","unlocked_at");
