-- Пол специалиста (2026-09-11): новый тип и nullable-колонка. Только добавление —
-- существующие строки не переписываются, прежняя версия кода колонку не замечает.
DO $$ BEGIN
  CREATE TYPE "public"."gender" AS ENUM('female', 'male');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD COLUMN IF NOT EXISTS "gender" "gender";
