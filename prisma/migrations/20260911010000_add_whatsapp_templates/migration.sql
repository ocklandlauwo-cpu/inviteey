-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "wid" VARCHAR(100) NOT NULL,
    "has_image_header" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);
