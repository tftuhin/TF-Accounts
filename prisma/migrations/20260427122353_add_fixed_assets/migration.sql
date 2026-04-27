-- CreateEnum
CREATE TYPE "asset_category" AS ENUM ('COMPUTER_ELECTRONICS', 'FURNITURE_FIXTURES', 'VEHICLES', 'SOFTWARE_LICENSES', 'OFFICE_EQUIPMENT', 'LAND_BUILDING', 'OTHER');

-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('ACTIVE', 'DISPOSED', 'WRITTEN_OFF');

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "asset_category" NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_cost" DECIMAL(15,2) NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'BDT',
    "useful_life_years" INTEGER NOT NULL,
    "salvage_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "asset_status" NOT NULL DEFAULT 'ACTIVE',
    "disposal_date" DATE,
    "disposal_value" DECIMAL(15,2),
    "journal_entry_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_assets_entity_id_idx" ON "fixed_assets"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_journal_entry_id_key" ON "fixed_assets"("journal_entry_id");

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
