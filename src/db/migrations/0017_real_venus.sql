CREATE TYPE "public"."marital_status" AS ENUM('single', 'married', 'divorced', 'widowed');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_place" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "educations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "experiences" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "certificates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "references" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "marital_status" "marital_status";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "drivers_license" varchar(50);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "linkedin" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "github" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "portfolio" text;