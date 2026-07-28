CREATE TYPE "public"."appointment_type" AS ENUM('online', 'face_to_face');--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "appointment_type" "appointment_type";
UPDATE "appointments" SET "appointment_type" = 'online' WHERE "appointment_type" IS NULL;
ALTER TABLE "appointments" ALTER COLUMN "appointment_type" SET NOT NULL;