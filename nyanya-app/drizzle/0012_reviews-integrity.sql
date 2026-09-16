-- Целостность отзывов (2026-09-16): статус «на проверке», дата правки, один отзыв на пару
-- «специалист — автор». Только добавление, плюс удаление дублей пары, без которого
-- уникальный индекс не создать: лишние строки сначала копируются в reviews_dedupe_backup
-- (остаётся самая поздняя по created_at — прежний код перезаписывал created_at при каждой
-- правке, так что это последнее мнение семьи), затем пересчитываются rating_avg/review_count
-- только у анкет, где дубли были (по видимым отзывам). На проде отзыв один — дублей нет.
--
-- Мигратор выполняет все новые миграции ОДНОЙ транзакцией, а значение enum, добавленное в
-- транзакции, в ней же использовать нельзя. Поэтому 'pending' здесь больше нигде не
-- встречается: default статуса остаётся 'visible', приложение пишет статус явно.
-- Прежний релиз, который работает во время preDeploy, 'pending' не пишет и не читает.
--
-- updated_at добавляется без default и заполняется из created_at: иначе у всех старых отзывов
-- датой правки стал бы момент миграции. Повторный запуск ничего не меняет (IF NOT EXISTS,
-- UPDATE и INSERT не находят строк, SET NOT NULL на заполненной колонке проходит).
-- Без CONCURRENTLY (невозможно внутри транзакции): ADD COLUMN берёт ACCESS EXCLUSIVE на reviews
-- до конца транзакции — на таблице в единицы строк это миллисекунды и для чтения, и для записи.
-- reviews_dedupe_backup намеренно нет в schema.ts: drizzle-kit сравнивает схему со снимком и её
-- не тронет.
ALTER TYPE "public"."review_status" ADD VALUE IF NOT EXISTS 'pending' BEFORE 'visible';--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamp;--> statement-breakpoint
UPDATE "reviews" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "updated_at" SET DEFAULT now(), ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews_dedupe_backup" (
	"id" uuid PRIMARY KEY NOT NULL,
	"specialist_id" uuid NOT NULL,
	"author_parent_id" text NOT NULL,
	"rating" integer NOT NULL,
	"text" text,
	"text_uz" text,
	"text_en" text,
	"status" "review_status" NOT NULL,
	"created_at" timestamp NOT NULL,
	"removed_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO "reviews_dedupe_backup" ("id", "specialist_id", "author_parent_id", "rating", "text", "text_uz", "text_en", "status", "created_at")
SELECT r."id", r."specialist_id", r."author_parent_id", r."rating", r."text", r."text_uz", r."text_en", r."status", r."created_at"
FROM "reviews" r
WHERE r."id" IN (
	SELECT t."id" FROM (
		SELECT "id", row_number() OVER (
			PARTITION BY "specialist_id", "author_parent_id"
			ORDER BY "created_at" DESC, "id" DESC
		) AS rn
		FROM "reviews"
	) t
	WHERE t.rn > 1
)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
DELETE FROM "reviews" r USING "reviews_dedupe_backup" b WHERE b."id" = r."id";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_review_specialist_parent" ON "reviews" USING btree ("specialist_id","author_parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_author_created_idx" ON "reviews" USING btree ("author_parent_id","created_at");--> statement-breakpoint
UPDATE "specialist_profiles" p
SET "rating_avg" = COALESCE(a.avg_rating, 0), "review_count" = COALESCE(a.n, 0), "updated_at" = now()
FROM (SELECT DISTINCT "specialist_id" FROM "reviews_dedupe_backup") aff
LEFT JOIN (
	SELECT "specialist_id", round(avg("rating")::numeric, 2) AS avg_rating, count(*)::int AS n
	FROM "reviews"
	WHERE "status" = 'visible'
	GROUP BY "specialist_id"
) a ON a."specialist_id" = aff."specialist_id"
WHERE p."id" = aff."specialist_id"
	AND (p."rating_avg" IS DISTINCT FROM COALESCE(a.avg_rating, 0) OR p."review_count" IS DISTINCT FROM COALESCE(a.n, 0));
