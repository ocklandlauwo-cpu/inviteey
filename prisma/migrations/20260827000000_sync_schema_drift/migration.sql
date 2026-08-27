-- AlterTable
ALTER TABLE "invitees" ADD COLUMN     "checkin_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pin" VARCHAR(6),
ADD COLUMN     "seat_type" VARCHAR(10) NOT NULL DEFAULT 'single';

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "event_type" "event_type",
    "channel" "notif_channel" NOT NULL,
    "type" "notif_type" NOT NULL,
    "language" "event_lang" NOT NULL DEFAULT 'en',
    "subject" VARCHAR(300),
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_payments" (
    "id" BIGSERIAL NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "event_id" INTEGER,
    "service_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "amount" BIGINT NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "payment_method" VARCHAR(30) NOT NULL DEFAULT 'mpesa',
    "reference_number" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "confirmed_by" INTEGER NOT NULL,
    "notes" TEXT,
    "invoice_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invoices" (
    "id" BIGSERIAL NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "service_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "amount" BIGINT NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notif_templates_channel" ON "notification_templates"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "platform_payments_invoice_id_key" ON "platform_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_pp_organizer" ON "platform_payments"("organizer_id");

-- CreateIndex
CREATE INDEX "idx_pp_event" ON "platform_payments"("event_id");

-- CreateIndex
CREATE INDEX "idx_pp_status" ON "platform_payments"("status");

-- CreateIndex
CREATE INDEX "idx_pp_paid_at" ON "platform_payments"("paid_at");

-- CreateIndex
CREATE INDEX "idx_pp_invoice" ON "platform_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_pinv_organizer" ON "platform_invoices"("organizer_id");

-- CreateIndex
CREATE INDEX "idx_pinv_event" ON "platform_invoices"("event_id");

-- CreateIndex
CREATE INDEX "idx_pinv_status" ON "platform_invoices"("status");

-- AddForeignKey
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "platform_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

