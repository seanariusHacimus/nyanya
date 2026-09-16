ALTER TABLE "specialist_profiles" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD CONSTRAINT "specialist_profiles_slug_unique" UNIQUE("slug");