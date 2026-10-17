CREATE TYPE "public"."invoice_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."invoice_upload_status" AS ENUM('pending', 'uploaded');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "invoice_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"invoice_number" varchar(100),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"invoice_date" timestamp with time zone NOT NULL,
	"file_key" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"upload_status" "invoice_upload_status" DEFAULT 'pending' NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "invoices_file_key_unique" UNIQUE("file_key"),
	CONSTRAINT "invoices_income_requires_number_chk" CHECK ("invoices"."type" <> 'income' OR "invoices"."invoice_number" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_invoice_date_idx" ON "invoices" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "invoices_type_idx" ON "invoices" USING btree ("type");