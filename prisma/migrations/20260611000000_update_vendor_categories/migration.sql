-- Replace "entertainment" vendor category with "cake_champagne", "food", "drinks"
BEGIN;

ALTER TYPE "vendor_cat" RENAME TO "vendor_cat_old";

CREATE TYPE "vendor_cat" AS ENUM ('catering', 'photography', 'decoration', 'cake_champagne', 'food', 'drinks', 'transport', 'venue', 'other');

ALTER TABLE "vendors" ALTER COLUMN "category" TYPE "vendor_cat" USING ("category"::text::"vendor_cat");

DROP TYPE "vendor_cat_old";

COMMIT;
