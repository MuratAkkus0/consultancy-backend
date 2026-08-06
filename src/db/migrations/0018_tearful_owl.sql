-- Add nullable first, backfill existing rows (every pre-existing document was
-- a student self-upload, so the uploader is the student), then enforce NOT NULL.
ALTER TABLE "documents" ADD COLUMN "uploaded_by_id" uuid;--> statement-breakpoint
UPDATE "documents" SET "uploaded_by_id" = "student_id" WHERE "uploaded_by_id" IS NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "uploaded_by_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;