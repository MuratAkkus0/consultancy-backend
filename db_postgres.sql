CREATE TYPE "user_role" AS ENUM (
  'student',
  'consultant',
  'admin'
);

CREATE TYPE "document_verification_status" AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE "application_status" AS ENUM (
  'Pending',
  'Preparing',
  'Sent',
  'Interview',
  'Accepted',
  'Rejected',
  'Canceled'
);

CREATE TYPE "subscription_status" AS ENUM (
  'pending',
  'active',
  'expired',
  'cancelled',
  'refunded'
);

CREATE TYPE "payment_status" AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded'
);

CREATE TYPE "payment_provider" AS ENUM (
  'stripe',
  'iyzico',
  'paypal'
);

CREATE TYPE "appointment_status" AS ENUM (
  'requested',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'no_show'
);

CREATE TYPE "meeting_provider" AS ENUM (
  'jitsi',
  'google_meet',
  'zoom'
);

CREATE TYPE "conversation_type" AS ENUM (
  'direct',
  'group'
);

CREATE TYPE "message_type" AS ENUM (
  'text',
  'image',
  'file',
  'system'
);

CREATE TYPE "device_platform" AS ENUM (
  'ios',
  'android',
  'web'
);

CREATE TYPE "education_level" AS ENUM (
  'high_school',
  'associates_degree',
  'bachelors_degree',
  'masters_degree',
  'doctorate'
);

CREATE TYPE "blog_post_status" AS ENUM (
  'draft',
  'pending_review',
  'published',
  'archived'
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "email" varchar(255) UNIQUE NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "email_verified_at" timestamp,
  "role" user_role NOT NULL,
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "phone" varchar(20),
  "profile_image_url" varchar(500),
  "preferred_language" varchar(10) DEFAULT 'tr',
  "timezone" varchar(50) DEFAULT 'Europe/Istanbul',
  "is_active" boolean DEFAULT true,
  "last_login_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now()),
  "deleted_at" timestamp
);

CREATE TABLE "student_profiles" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid UNIQUE NOT NULL,
  "birth_date" date,
  "gender" varchar(20),
  "nationality" varchar(50),
  "passport_number" varchar(50),
  "current_education_level" education_level,
  "current_school" varchar(200),
  "gpa" decimal(3,2) CHECK (gpa >= 0 AND gpa <= 4),
  "ielts_score" decimal(3,1) CHECK (ielts_score >= 0 AND ielts_score <= 9),
  "toefl_score" int CHECK (toefl_score >= 0 AND toefl_score <= 120),
  "target_countries" jsonb,
  "target_education_level" education_level,
  "target_programs" jsonb,
  "budget_range" varchar(50),
  "additional_info" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "consultant_profiles" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid UNIQUE NOT NULL,
  "biography" text,
  "years_of_experience" int CHECK (years_of_experience >= 0) DEFAULT 0,
  "specializations" jsonb,
  "languages_spoken" jsonb,
  "education" text,
  "certifications" jsonb,
  "max_active_students" int DEFAULT 20,
  "is_available" boolean DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "admin_profiles" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid UNIQUE NOT NULL,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "consultant_assignments" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "student_id" uuid NOT NULL,
  "consultant_id" uuid NOT NULL,
  "assigned_by" uuid NOT NULL,
  "assigned_at" timestamp NOT NULL DEFAULT (now()),
  "unassigned_at" timestamp,
  "is_active" boolean DEFAULT true,
  "reason_for_change" text,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "documents" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "document_type" varchar(100) NOT NULL,
  "custom_name" varchar(200),
  "storage_key" varchar(500) NOT NULL,
  "original_filename" varchar(500) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "file_size_bytes" bigint NOT NULL CHECK (file_size_bytes > 0),
  "description" text,
  "verification_status" document_verification_status DEFAULT 'pending',
  "verified_by" uuid,
  "verified_at" timestamp,
  "rejection_reason" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now()),
  "deleted_at" timestamp
);

CREATE TABLE "applications" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "student_id" uuid NOT NULL,
  "country" varchar(100) NOT NULL,
  "university" varchar(200) NOT NULL,
  "program" varchar(200) NOT NULL,
  "degree_level" education_level NOT NULL,
  "intake_term" varchar(50) NOT NULL,
  "application_deadline" date,
  "current_status" application_status DEFAULT 'beklemede',
  "application_fee" decimal(10,2),
  "application_fee_currency" varchar(3),
  "application_fee_paid" boolean DEFAULT false,
  "application_reference" varchar(200),
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now()),
  "deleted_at" timestamp
);

CREATE TABLE "application_status_history" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "application_id" uuid NOT NULL,
  "old_status" application_status,
  "new_status" application_status NOT NULL,
  "changed_by" uuid NOT NULL,
  "note" text,
  "is_visible_to_student" boolean DEFAULT true,
  "changed_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "consultant_notes" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "student_id" uuid NOT NULL,
  "consultant_id" uuid NOT NULL,
  "content" text NOT NULL,
  "is_pinned" boolean DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now()),
  "deleted_at" timestamp
);

CREATE TABLE "service_packages" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar(200) NOT NULL,
  "slug" varchar(200) UNIQUE NOT NULL,
  "description" text,
  "features" text,
  "price" decimal(10,2) NOT NULL CHECK (price >= 0),
  "currency" varchar(3) NOT NULL DEFAULT 'TRY',
  "duration_days" int NOT NULL CHECK (duration_days > 0),
  "is_active" boolean DEFAULT true,
  "display_order" int DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "user_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "payment_id" uuid,
  "starts_at" timestamp NOT NULL,
  "expires_at" timestamp NOT NULL,
  "status" subscription_status DEFAULT 'pending',
  "cancelled_at" timestamp,
  "cancellation_reason" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "package_id" uuid,
  "amount" decimal(10,2) NOT NULL CHECK (amount > 0),
  "currency" varchar(3) NOT NULL,
  "provider" payment_provider NOT NULL,
  "provider_payment_id" varchar(255),
  "provider_metadata" jsonb,
  "status" payment_status DEFAULT 'pending',
  "failure_reason" text,
  "refunded_amount" decimal(10,2),
  "refunded_at" timestamp,
  "invoice_number" varchar(100),
  "billing_name" varchar(200),
  "billing_tax_id" varchar(50),
  "billing_address" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "appointments" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "student_id" uuid NOT NULL,
  "consultant_id" uuid NOT NULL,
  "scheduled_at" timestamp NOT NULL,
  "duration_minutes" int CHECK (duration_minutes > 0) DEFAULT 30,
  "topic" varchar(500),
  "notes" text,
  "meeting_url" varchar(500),
  "meeting_provider" meeting_provider,
  "status" appointment_status DEFAULT 'requested',
  "requested_by" uuid NOT NULL,
  "confirmed_at" timestamp,
  "cancelled_by" uuid,
  "cancellation_reason" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "type" conversation_type DEFAULT 'direct',
  "title" varchar(200),
  "last_message_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "conversation_participants" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "joined_at" timestamp NOT NULL DEFAULT (now()),
  "left_at" timestamp,
  "last_read_message_id" uuid,
  "is_muted" boolean DEFAULT false
);

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "content" text,
  "message_type" message_type DEFAULT 'text',
  "attachment_storage_key" varchar(500),
  "attachment_filename" varchar(500),
  "attachment_mime_type" varchar(100),
  "attachment_size_bytes" bigint,
  "reply_to_message_id" uuid,
  "is_edited" boolean DEFAULT false,
  "edited_at" timestamp,
  "is_deleted" boolean DEFAULT false,
  "deleted_at" timestamp,
  "sent_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "message_reads" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "message_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "read_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "type" varchar(50) NOT NULL,
  "title" varchar(200) NOT NULL,
  "content" text NOT NULL,
  "related_entity_type" varchar(50),
  "related_entity_id" uuid,
  "action_url" varchar(500),
  "is_read" boolean DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid UNIQUE NOT NULL,
  "email_new_message" boolean DEFAULT true,
  "email_status_change" boolean DEFAULT true,
  "email_appointment" boolean DEFAULT true,
  "email_marketing" boolean DEFAULT false,
  "push_new_message" boolean DEFAULT true,
  "push_status_change" boolean DEFAULT true,
  "push_appointment" boolean DEFAULT true,
  "in_app_enabled" boolean DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "user_devices" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "device_token" varchar(500) UNIQUE NOT NULL,
  "platform" device_platform NOT NULL,
  "device_name" varchar(200),
  "app_version" varchar(50),
  "last_used_at" timestamp DEFAULT (now()),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "blog_categories" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) UNIQUE NOT NULL,
  "description" text,
  "icon" varchar(100),
  "color" varchar(20),
  "display_order" int DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "blog_tags" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar(50) NOT NULL,
  "slug" varchar(50) UNIQUE NOT NULL,
  "usage_count" int DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "author_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "title" varchar(300) NOT NULL,
  "slug" varchar(300) UNIQUE NOT NULL,
  "excerpt" text,
  "content" text NOT NULL,
  "featured_image_url" varchar(500),
  "featured_image_alt" varchar(300),
  "meta_title" varchar(300),
  "meta_description" varchar(500),
  "meta_keywords" varchar(500),
  "status" blog_post_status DEFAULT 'draft',
  "is_featured" boolean DEFAULT false,
  "reading_time_minutes" int,
  "view_count" int DEFAULT 0,
  "published_at" timestamp,
  "reviewed_by" uuid,
  "reviewed_at" timestamp,
  "rejection_reason" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now()),
  "deleted_at" timestamp
);

CREATE TABLE "blog_post_tags" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "post_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE UNIQUE INDEX ON "users" ("email");

CREATE INDEX ON "users" ("role");

CREATE INDEX ON "users" ("deleted_at");

CREATE INDEX ON "consultant_profiles" ("is_available");

CREATE INDEX ON "consultant_assignments" ("student_id");

CREATE INDEX ON "consultant_assignments" ("consultant_id");

CREATE INDEX "idx_student_active_assignment" ON "consultant_assignments" ("student_id", "is_active");

CREATE INDEX ON "documents" ("user_id");

CREATE INDEX ON "documents" ("document_type");

CREATE INDEX ON "documents" ("verification_status");

CREATE INDEX ON "applications" ("student_id");

CREATE INDEX ON "applications" ("current_status");

CREATE INDEX ON "applications" ("application_deadline");

CREATE INDEX ON "application_status_history" ("application_id");

CREATE INDEX ON "application_status_history" ("changed_at");

CREATE INDEX ON "consultant_notes" ("student_id");

CREATE INDEX ON "consultant_notes" ("consultant_id");

CREATE INDEX ON "consultant_notes" ("is_pinned");

CREATE UNIQUE INDEX ON "service_packages" ("slug");

CREATE INDEX ON "service_packages" ("is_active");

CREATE INDEX ON "user_subscriptions" ("user_id");

CREATE INDEX ON "user_subscriptions" ("status");

CREATE INDEX ON "user_subscriptions" ("expires_at");

CREATE INDEX "idx_user_subscription_status" ON "user_subscriptions" ("user_id", "status");

CREATE INDEX ON "payments" ("user_id");

CREATE INDEX ON "payments" ("status");

CREATE INDEX ON "payments" ("provider_payment_id");

CREATE INDEX ON "payments" ("created_at");

CREATE INDEX ON "appointments" ("student_id");

CREATE INDEX ON "appointments" ("consultant_id");

CREATE INDEX ON "appointments" ("scheduled_at");

CREATE INDEX ON "appointments" ("status");

CREATE INDEX ON "conversations" ("last_message_at");

CREATE UNIQUE INDEX ON "conversation_participants" ("conversation_id", "user_id");

CREATE INDEX ON "conversation_participants" ("user_id");

CREATE INDEX ON "messages" ("conversation_id");

CREATE INDEX ON "messages" ("sender_id");

CREATE INDEX ON "messages" ("sent_at");

CREATE INDEX "idx_conversation_messages_time" ON "messages" ("conversation_id", "sent_at");

CREATE UNIQUE INDEX ON "message_reads" ("message_id", "user_id");

CREATE INDEX ON "message_reads" ("user_id");

CREATE INDEX ON "notifications" ("user_id");

CREATE INDEX "idx_user_unread_notifications" ON "notifications" ("user_id", "is_read");

CREATE INDEX ON "notifications" ("created_at");

CREATE INDEX ON "user_devices" ("user_id");

CREATE UNIQUE INDEX ON "user_devices" ("device_token");

CREATE INDEX ON "user_devices" ("is_active");

CREATE UNIQUE INDEX ON "blog_categories" ("slug");

CREATE INDEX ON "blog_categories" ("is_active");

CREATE INDEX ON "blog_categories" ("display_order");

CREATE UNIQUE INDEX ON "blog_tags" ("slug");

CREATE INDEX ON "blog_tags" ("name");

CREATE INDEX ON "blog_tags" ("usage_count");

CREATE UNIQUE INDEX ON "blog_posts" ("slug");

CREATE INDEX ON "blog_posts" ("author_id");

CREATE INDEX ON "blog_posts" ("category_id");

CREATE INDEX ON "blog_posts" ("status");

CREATE INDEX ON "blog_posts" ("published_at");

CREATE INDEX ON "blog_posts" ("is_featured");

CREATE INDEX "idx_published_posts" ON "blog_posts" ("status", "published_at");

CREATE UNIQUE INDEX ON "blog_post_tags" ("post_id", "tag_id");

CREATE INDEX ON "blog_post_tags" ("post_id");

CREATE INDEX ON "blog_post_tags" ("tag_id");

COMMENT ON COLUMN "student_profiles"."passport_number" IS 'Şifrelenmiş tutulmalı';

COMMENT ON COLUMN "student_profiles"."target_countries" IS 'Liste: ["Almanya", "Hollanda"]';

COMMENT ON COLUMN "consultant_profiles"."specializations" IS 'Liste: ["Almanya", "lisans"]';

COMMENT ON COLUMN "consultant_profiles"."languages_spoken" IS 'Liste: ["tr", "en", "de"]';

COMMENT ON COLUMN "consultant_assignments"."assigned_by" IS 'Hangi admin atadı';

COMMENT ON COLUMN "documents"."document_type" IS 'pasaport, transkript, diploma vb.';

COMMENT ON COLUMN "documents"."storage_key" IS 'R2/S3 dosya yolu';

COMMENT ON COLUMN "applications"."intake_term" IS '2026_fall, 2027_spring vb.';

COMMENT ON COLUMN "applications"."application_reference" IS 'Üniversitenin verdiği referans no';

COMMENT ON COLUMN "application_status_history"."old_status" IS 'İlk kayıtta NULL';

COMMENT ON COLUMN "service_packages"."features" IS 'Markdown formatında özellikler';

COMMENT ON COLUMN "payments"."provider_payment_id" IS 'Stripe/Iyzico ID';

COMMENT ON COLUMN "payments"."billing_tax_id" IS 'TC veya vergi no';

COMMENT ON COLUMN "appointments"."scheduled_at" IS 'UTC olarak tutulmalı';

COMMENT ON COLUMN "conversations"."title" IS 'Grup sohbetleri için';

COMMENT ON COLUMN "messages"."content" IS 'Sadece dosya gönderildiyse NULL olabilir';

COMMENT ON COLUMN "notifications"."type" IS 'new_message, status_changed, appointment_request vb.';

COMMENT ON COLUMN "notifications"."related_entity_type" IS 'message, application, appointment';

COMMENT ON COLUMN "blog_categories"."name" IS 'Almanya, ABD, Vize Süreci vb.';

COMMENT ON COLUMN "blog_categories"."slug" IS 'URL için: almanya, abd, vize-sureci';

COMMENT ON COLUMN "blog_categories"."icon" IS 'Ikon ismi veya emoji';

COMMENT ON COLUMN "blog_categories"."color" IS 'Kategoriyi temsil eden renk';

COMMENT ON COLUMN "blog_tags"."slug" IS 'URL için';

COMMENT ON COLUMN "blog_tags"."usage_count" IS 'Kaç yazıda kullanıldı (performans için)';

COMMENT ON COLUMN "blog_posts"."author_id" IS 'Yazıyı yazan kullanıcı (admin veya danışman)';

COMMENT ON COLUMN "blog_posts"."slug" IS 'URL için: almanya-da-yuksek-lisans-rehberi';

COMMENT ON COLUMN "blog_posts"."excerpt" IS 'Liste sayfasında görünen kısa özet';

COMMENT ON COLUMN "blog_posts"."content" IS 'Markdown veya HTML formatında ana içerik';

COMMENT ON COLUMN "blog_posts"."featured_image_url" IS 'Öne çıkan görsel (R2/S3)';

COMMENT ON COLUMN "blog_posts"."featured_image_alt" IS 'SEO için alt text';

COMMENT ON COLUMN "blog_posts"."meta_title" IS 'SEO için, boşsa title kullanılır';

COMMENT ON COLUMN "blog_posts"."meta_description" IS 'Google sonuçlarında görünen açıklama';

COMMENT ON COLUMN "blog_posts"."meta_keywords" IS 'Virgülle ayrılmış anahtar kelimeler';

COMMENT ON COLUMN "blog_posts"."is_featured" IS 'Ana sayfada öne çıkanlar bölümünde göster';

COMMENT ON COLUMN "blog_posts"."reading_time_minutes" IS 'Tahmini okuma süresi';

COMMENT ON COLUMN "blog_posts"."view_count" IS 'Görüntülenme sayısı';

COMMENT ON COLUMN "blog_posts"."published_at" IS 'Yayınlanma tarihi (gelecekte de olabilir - zamanlanmış yayın)';

COMMENT ON COLUMN "blog_posts"."reviewed_by" IS 'Onaylayan admin (eğer onay süreci varsa)';

COMMENT ON COLUMN "blog_posts"."rejection_reason" IS 'Reddedildiyse neden';

ALTER TABLE "student_profiles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "consultant_profiles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "admin_profiles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "consultant_assignments" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "consultant_assignments" ADD FOREIGN KEY ("consultant_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "consultant_assignments" ADD FOREIGN KEY ("assigned_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "documents" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "documents" ADD FOREIGN KEY ("verified_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "applications" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "application_status_history" ADD FOREIGN KEY ("application_id") REFERENCES "applications" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "application_status_history" ADD FOREIGN KEY ("changed_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "consultant_notes" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "consultant_notes" ADD FOREIGN KEY ("consultant_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_subscriptions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_subscriptions" ADD FOREIGN KEY ("package_id") REFERENCES "service_packages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_subscriptions" ADD FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("package_id") REFERENCES "service_packages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "appointments" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "appointments" ADD FOREIGN KEY ("consultant_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "appointments" ADD FOREIGN KEY ("requested_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "appointments" ADD FOREIGN KEY ("cancelled_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation_participants" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation_participants" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation_participants" ADD FOREIGN KEY ("last_read_message_id") REFERENCES "messages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "messages" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "messages" ADD FOREIGN KEY ("sender_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "messages" ADD FOREIGN KEY ("reply_to_message_id") REFERENCES "messages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message_reads" ADD FOREIGN KEY ("message_id") REFERENCES "messages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message_reads" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_preferences" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_devices" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "blog_posts" ADD FOREIGN KEY ("author_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "blog_posts" ADD FOREIGN KEY ("category_id") REFERENCES "blog_categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "blog_posts" ADD FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "blog_post_tags" ADD FOREIGN KEY ("post_id") REFERENCES "blog_posts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "blog_post_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "blog_tags" ("id") DEFERRABLE INITIALLY IMMEDIATE;
