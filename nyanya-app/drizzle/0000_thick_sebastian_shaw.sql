CREATE TYPE "public"."category" AS ENUM('nanny', 'caregiver', 'tutor', 'driver');--> statement-breakpoint
CREATE TYPE "public"."complaint_category" AS ENUM('fake_profile', 'fraud', 'spam', 'misconduct', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('open', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('passport', 'selfie', 'video_intro', 'profile_photo', 'recommendation', 'medical_general', 'medical_psychiatrist', 'medical_tb_aids', 'other');--> statement-breakpoint
CREATE TYPE "public"."english_level" AS ENUM('none', 'basic', 'fluent');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('verification_status', 'new_review', 'contact_unlocked', 'listing_published', 'system');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('mock', 'payme', 'click', 'uzum');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('specialist_listing', 'contact_unlock', 'unlock_package', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('hour', 'day', 'month');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('draft', 'pending_review', 'active', 'hidden', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('visible', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."verification_level" AS ENUM('unverified', 'verified', 'premium_verified');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_ru" text NOT NULL,
	"name_uz" text NOT NULL,
	"name_en" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"target_specialist_id" uuid,
	"category" "complaint_category" NOT NULL,
	"text" text,
	"status" "complaint_status" DEFAULT 'open' NOT NULL,
	"handled_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" text NOT NULL,
	"specialist_id" uuid NOT NULL,
	"payment_id" uuid,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_parent_specialist_unlock" UNIQUE("parent_id","specialist_id")
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"name_ru" text NOT NULL,
	"name_uz" text NOT NULL,
	"name_en" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"specialist_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"file_key" text NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"parent_id" text NOT NULL,
	"specialist_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_parent_id_specialist_id_pk" PRIMARY KEY("parent_id","specialist_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"purpose" "payment_purpose" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"provider" "payment_provider" DEFAULT 'mock' NOT NULL,
	"provider_txn_id" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"related_specialist_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"specialist_id" uuid NOT NULL,
	"author_parent_id" text NOT NULL,
	"rating" integer NOT NULL,
	"text" text,
	"status" "review_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialist_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" "category" NOT NULL,
	"full_name" text NOT NULL,
	"photo_key" text,
	"birth_date" date,
	"city_id" integer,
	"district_id" integer,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"education" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"price_amount" integer DEFAULT 0 NOT NULL,
	"price_unit" "price_unit" DEFAULT 'hour' NOT NULL,
	"description" text,
	"video_intro_key" text,
	"has_car" boolean DEFAULT false NOT NULL,
	"live_in" boolean DEFAULT false NOT NULL,
	"night_available" boolean DEFAULT false NOT NULL,
	"newborn_exp" boolean DEFAULT false NOT NULL,
	"english_level" "english_level" DEFAULT 'none' NOT NULL,
	"status" "profile_status" DEFAULT 'draft' NOT NULL,
	"verification_level" "verification_level" DEFAULT 'unverified' NOT NULL,
	"trust_score" integer DEFAULT 0 NOT NULL,
	"employed" boolean DEFAULT false NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"unlock_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "specialist_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'parent' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'ru' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_target_specialist_id_specialist_profiles_id_fk" FOREIGN KEY ("target_specialist_id") REFERENCES "public"."specialist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_parent_id_user_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_specialist_id_specialist_profiles_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_unlocks" ADD CONSTRAINT "contact_unlocks_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_specialist_id_specialist_profiles_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_parent_id_user_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_specialist_id_specialist_profiles_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_related_specialist_id_specialist_profiles_id_fk" FOREIGN KEY ("related_specialist_id") REFERENCES "public"."specialist_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_specialist_id_specialist_profiles_id_fk" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialist_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_parent_id_user_id_fk" FOREIGN KEY ("author_parent_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD CONSTRAINT "specialist_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD CONSTRAINT "specialist_profiles_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialist_profiles" ADD CONSTRAINT "specialist_profiles_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "specialist_category_idx" ON "specialist_profiles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "specialist_status_idx" ON "specialist_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "specialist_city_idx" ON "specialist_profiles" USING btree ("city_id");