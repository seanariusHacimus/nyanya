-- Хранилище ограничений частоты (2026-09-16): счётчики переезжают из памяти процесса в базу.
-- rate_limit — таблица Better Auth (rateLimit.storage: "database"), app_rate_limits — окна
-- собственных маршрутов (форма обратной связи). Только добавление — существующие таблицы не
-- трогаются, прежняя версия кода новые таблицы не замечает; повторный запуск ничего не меняет.
CREATE TABLE IF NOT EXISTS "app_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_rate_limits_expires_at_idx" ON "app_rate_limits" USING btree ("expires_at");
