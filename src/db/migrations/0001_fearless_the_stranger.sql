CREATE TYPE "public"."consent_type" AS ENUM('data_processing', 'marketing', 'terms_of_service');--> statement-breakpoint
CREATE TYPE "public"."language_level" AS ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2');--> statement-breakpoint
ALTER TYPE "public"."education_level" ADD VALUE 'apprentice' BEFORE 'bachelor';--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "consent_type" NOT NULL,
	"version" text NOT NULL,
	"content_hash" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_languages" (
	"student_id" uuid NOT NULL,
	"language_id" uuid NOT NULL,
	"level" "language_level",
	"certificates" text[] DEFAULT '{}',
	CONSTRAINT "student_languages_student_id_language_id_pk" PRIMARY KEY("student_id","language_id")
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "has_green_passport" boolean;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "current_field_of_study" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "prefered_start_date" date;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "finance_source" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "applied_visa_before" boolean;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "currently_in_visa_process" boolean;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "country_of_residence" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "city_of_residence" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "is_data_processing_accepted" boolean;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_consents_user_id_type_idx" ON "user_consents" USING btree ("user_id","type");--> statement-breakpoint
ALTER TABLE "student_profiles" DROP COLUMN "ielts_score";--> statement-breakpoint
ALTER TABLE "student_profiles" DROP COLUMN "toefl_score";