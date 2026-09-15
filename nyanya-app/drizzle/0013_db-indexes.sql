-- Индексы для горячих запросов (2026-09-16). Только CREATE INDEX IF NOT EXISTS:
-- данные не меняются, прежний релиз, который работает во время preDeploy, индексов
-- не замечает, повторный запуск ничего не делает.
--
-- Без CONCURRENTLY: мигратор выполняет все новые миграции ОДНОЙ транзакцией, а
-- CREATE INDEX CONCURRENTLY внутри транзакции запрещён. Обычный CREATE INDEX держит
-- на таблице SHARE (чтение идёт, запись ждёт) на время построения — при нынешних
-- размерах (сотни строк) это миллисекунды. Если notifications или session когда-нибудь
-- вырастут до сотен тысяч строк, индексы строятся заранее вручную через
-- CREATE INDEX CONCURRENTLY, и эта миграция становится пустой операцией.
--
-- Чего здесь намеренно нет: reviews(specialist_id) — ведущая колонка уникального
-- индекса uniq_review_specialist_parent (миграция 0012); contact_unlocks(parent_id,
-- unlocked_at) — добавлен миграцией 0011.
CREATE INDEX IF NOT EXISTS "notifications_user_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" USING btree ("user_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");
