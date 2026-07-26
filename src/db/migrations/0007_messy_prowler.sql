CREATE TYPE "public"."application_status_enum" AS ENUM('applied', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"consultant_id" uuid NOT NULL,
	"consultant_notes" text,
	"application_title" varchar(200) NOT NULL,
	"status" "application_status_enum" DEFAULT 'applied' NOT NULL,
	"university_name" text,
	"target_program" text,
	"monthly_salary" numeric(12, 2),
	"website_link" text,
	"target_city" text,
	"target_state" text,
	"program_start_date" date,
	"program_end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"consultant_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"meeting_link" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_consultant_id_users_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_consultant_id_users_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_student_id_idx" ON "applications" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "applications_consultant_id_idx" ON "applications" USING btree ("consultant_id");--> statement-breakpoint
CREATE INDEX "appointments_student_id_idx" ON "appointments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "appointments_consultant_id_idx" ON "appointments" USING btree ("consultant_id");--> statement-breakpoint
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_consultant_appointment_slot" ON "appointments" USING btree ("consultant_id","scheduled_at") WHERE deleted_at IS NULL;