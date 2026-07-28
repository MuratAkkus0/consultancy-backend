ALTER TYPE "public"."user_status" ADD VALUE 'soft_deleted' BEFORE 'deleted';--> statement-breakpoint
ALTER TABLE "consultant_assignments" ADD COLUMN "consultant_notes" text[] DEFAULT '{}';