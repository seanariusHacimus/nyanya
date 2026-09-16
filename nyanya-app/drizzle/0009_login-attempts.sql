-- Неудачные входы по паролю (2026-09-16): строка на пару «адрес почты + IP» и строка
-- с ip = '*' на адрес целиком. Только добавление — существующие таблицы не трогаются,
-- прежняя версия кода таблицу не замечает; повторный запуск ничего не меняет.
CREATE TABLE IF NOT EXISTS "login_attempts" (
	"email" text NOT NULL,
	"ip" text NOT NULL,
	"failures" integer NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	CONSTRAINT "login_attempts_email_ip_pk" PRIMARY KEY("email","ip")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_attempts_last_failed_at_idx" ON "login_attempts" USING btree ("last_failed_at");
