ALTER TYPE "public"."document_type" ADD VALUE 'criminal_record';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'narcology';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'profile_submitted';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'profile_rejected';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD COLUMN "moderation_note" text;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
CREATE INDEX "documents_specialist_idx" ON "documents" USING btree ("specialist_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "uniq_specialist_document_type" UNIQUE("specialist_id","type");