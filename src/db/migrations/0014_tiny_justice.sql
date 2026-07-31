ALTER TABLE "student_profiles" ADD COLUMN "passport_validity" date;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "schengen_entry" boolean;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "last_schengen_entry_date" date;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "schengen_90_days_used" boolean;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "previous_abroad_experience" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "visa_rejection_reason" text;