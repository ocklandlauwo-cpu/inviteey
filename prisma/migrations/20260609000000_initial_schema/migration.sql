-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('organizer', 'admin', 'vendor', 'staff');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'unverified');

-- CreateEnum
CREATE TYPE "event_type" AS ENUM ('wedding', 'birthday', 'sendoff', 'kitchen_party', 'corporate', 'fundraising', 'other');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('draft', 'active', 'event_day', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "event_lang" AS ENUM ('en', 'sw');

-- CreateEnum
CREATE TYPE "event_tier" AS ENUM ('basic', 'standard', 'premium', 'royal');

-- CreateEnum
CREATE TYPE "invitee_cat" AS ENUM ('family', 'friends', 'colleagues', 'vip', 'other');

-- CreateEnum
CREATE TYPE "rsvp_status" AS ENUM ('pending', 'confirmed', 'declined');

-- CreateEnum
CREATE TYPE "checkin_st" AS ENUM ('not_arrived', 'checked_in');

-- CreateEnum
CREATE TYPE "gen_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "pledge_type" AS ENUM ('fixed', 'flexible');

-- CreateEnum
CREATE TYPE "pledge_status" AS ENUM ('unpaid', 'partially_paid', 'fully_paid');

-- CreateEnum
CREATE TYPE "vendor_cat" AS ENUM ('catering', 'photography', 'decoration', 'entertainment', 'transport', 'venue', 'other');

-- CreateEnum
CREATE TYPE "vendor_pay_st" AS ENUM ('unpaid', 'partially_paid', 'fully_paid');

-- CreateEnum
CREATE TYPE "vendor_del_st" AS ENUM ('confirmed', 'in_progress', 'completed', 'issue_reported');

-- CreateEnum
CREATE TYPE "notif_type" AS ENUM ('invitation', 'reminder', 'rsvp_followup', 'contribution_reminder', 'ecard', 'cancellation', 'contribution_ack');

-- CreateEnum
CREATE TYPE "notif_channel" AS ENUM ('sms', 'whatsapp', 'email');

-- CreateEnum
CREATE TYPE "notif_group" AS ENUM ('all', 'by_category', 'by_status', 'selected');

-- CreateEnum
CREATE TYPE "notif_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "delivery_st" AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "rsvp_resp" AS ENUM ('yes', 'no', 'unknown');

-- CreateEnum
CREATE TYPE "scan_method" AS ENUM ('qr', 'manual');

-- CreateEnum
CREATE TYPE "audit_op" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30),
    "role" "user_role" NOT NULL DEFAULT 'organizer',
    "status" "user_status" NOT NULL DEFAULT 'unverified',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(200) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(200) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "event_type" NOT NULL,
    "status" "event_status" NOT NULL DEFAULT 'draft',
    "event_date" TIMESTAMP(3) NOT NULL,
    "venue_name" VARCHAR(300) NOT NULL,
    "venue_address" TEXT,
    "description" TEXT,
    "language" "event_lang" NOT NULL DEFAULT 'en',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'TZS',
    "cover_image_path" VARCHAR(500),
    "expected_guests" INTEGER,
    "ecard_template_id" INTEGER,
    "tier" "event_tier" NOT NULL DEFAULT 'basic',
    "invitee_limit" INTEGER NOT NULL DEFAULT 5,
    "ecard_addon_active" BOOLEAN NOT NULL DEFAULT false,
    "notifications_addon_active" BOOLEAN NOT NULL DEFAULT false,
    "tier_activated_at" TIMESTAMP(3),
    "tier_activated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "access_token" VARCHAR(200) NOT NULL,
    "pin" CHAR(6) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitees" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(200),
    "category" "invitee_cat" NOT NULL DEFAULT 'other',
    "qr_token" UUID NOT NULL,
    "rsvp_status" "rsvp_status" NOT NULL DEFAULT 'pending',
    "checkin_status" "checkin_st" NOT NULL DEFAULT 'not_arrived',
    "contribution_flag" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecard_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "event_type" "event_type" NOT NULL,
    "image_path" VARCHAR(500) NOT NULL,
    "thumbnail_path" VARCHAR(500),
    "text_fields" JSONB,
    "qr_position" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecards" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "invitee_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "template_id" INTEGER NOT NULL,
    "image_path" VARCHAR(500),
    "status" "gen_status" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledges" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "invitee_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "type" "pledge_type" NOT NULL DEFAULT 'fixed',
    "amount" BIGINT NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'TZS',
    "status" "pledge_status" NOT NULL DEFAULT 'unpaid',
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "pledge_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'TZS',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "event_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" "vendor_cat" NOT NULL,
    "service_description" TEXT,
    "estimated_cost" BIGINT,
    "agreed_cost" BIGINT,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'TZS',
    "payment_status" "vendor_pay_st" NOT NULL DEFAULT 'unpaid',
    "delivery_status" "vendor_del_st" NOT NULL DEFAULT 'confirmed',
    "contact_phone" VARCHAR(30),
    "contact_email" VARCHAR(200),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_budgets" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "total_budget" BIGINT,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'TZS',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "type" "notif_type" NOT NULL,
    "channel" "notif_channel" NOT NULL,
    "subject" VARCHAR(300),
    "message" TEXT NOT NULL,
    "language" "event_lang" NOT NULL DEFAULT 'en',
    "recipient_group" "notif_group" NOT NULL DEFAULT 'all',
    "status" "notif_status" NOT NULL DEFAULT 'pending',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" SERIAL NOT NULL,
    "notification_id" INTEGER NOT NULL,
    "invitee_id" INTEGER NOT NULL,
    "channel" "notif_channel" NOT NULL,
    "status" "delivery_st" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvp_responses" (
    "id" SERIAL NOT NULL,
    "invitee_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "response" "rsvp_resp" NOT NULL,
    "raw_message" TEXT,
    "source_phone" VARCHAR(30),
    "responded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvp_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "invitee_id" INTEGER NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "method" "scan_method" NOT NULL DEFAULT 'qr',
    "checked_in_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" INTEGER NOT NULL,
    "operation" "audit_op" NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "changed_by" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_key" ON "email_verifications"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "idx_events_organizer" ON "events"("organizer_id");

-- CreateIndex
CREATE INDEX "idx_events_tier" ON "events"("tier");

-- CreateIndex
CREATE INDEX "idx_events_tier_activated" ON "events"("tier_activated_by");

-- CreateIndex
CREATE UNIQUE INDEX "event_staff_access_token_key" ON "event_staff"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "invitees_qr_token_key" ON "invitees"("qr_token");

-- CreateIndex
CREATE INDEX "idx_invitees_event_org" ON "invitees"("event_id", "organizer_id");

-- CreateIndex
CREATE INDEX "idx_invitees_qr_token" ON "invitees"("qr_token");

-- CreateIndex
CREATE INDEX "idx_ecards_event_invitee" ON "ecards"("event_id", "invitee_id");

-- CreateIndex
CREATE INDEX "idx_pledges_event_invitee" ON "pledges"("event_id", "invitee_id");

-- CreateIndex
CREATE INDEX "idx_payments_pledge" ON "payments"("pledge_id");

-- CreateIndex
CREATE INDEX "idx_vendors_event" ON "vendors"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_budgets_event_id_key" ON "event_budgets"("event_id");

-- CreateIndex
CREATE INDEX "idx_notifications_event" ON "notifications"("event_id");

-- CreateIndex
CREATE INDEX "idx_notif_recipients_notif" ON "notification_recipients"("notification_id");

-- CreateIndex
CREATE INDEX "idx_rsvp_invitee" ON "rsvp_responses"("invitee_id");

-- CreateIndex
CREATE INDEX "idx_checkins_event_invitee" ON "checkins"("event_id", "invitee_id");

-- CreateIndex
CREATE INDEX "idx_audit_table_record" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "idx_audit_changed_at" ON "audit_logs"("changed_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tier_activated_by_fkey" FOREIGN KEY ("tier_activated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_ecard_template_id_fkey" FOREIGN KEY ("ecard_template_id") REFERENCES "ecard_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitees" ADD CONSTRAINT "invitees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitees" ADD CONSTRAINT "invitees_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecards" ADD CONSTRAINT "ecards_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecards" ADD CONSTRAINT "ecards_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "invitees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecards" ADD CONSTRAINT "ecards_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecards" ADD CONSTRAINT "ecards_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ecard_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "invitees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_pledge_id_fkey" FOREIGN KEY ("pledge_id") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_budgets" ADD CONSTRAINT "event_budgets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "invitees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "invitees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "invitees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

