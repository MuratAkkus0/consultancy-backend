ALTER TABLE "payments" DROP CONSTRAINT "payments_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_recorded_by_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "uniq_active_enrollment";--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "consultant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "consultant_notes" text;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_role_created_at_idx" ON "users" USING btree ("role","created_at");--> statement-breakpoint
CREATE INDEX "student_courses_student_id_idx" ON "student_courses" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_courses_course_id_idx" ON "student_courses" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_active_enrollment" ON "student_courses" USING btree ("course_id","student_id") WHERE deleted_at IS NULL;