CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paid_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paid_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "status" "payment_status" DEFAULT 'pending' NOT NULL;
UPDATE "payments" SET "status" = 'paid' WHERE "paid_at" IS NOT NULL;