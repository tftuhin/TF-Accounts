-- CreateEnum
CREATE TYPE "investment_category" AS ENUM ('WEB_THEME', 'PLUGIN', 'SOFTWARE_SUBSCRIPTION', 'TEMPLATE', 'DIGITAL_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "investment_status" AS ENUM ('ACTIVE', 'FULLY_PAID', 'EXPIRED');

-- CreateTable
CREATE TABLE "investments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "investment_category" NOT NULL,
    "status" "investment_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "investment_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'BDT',
    "payment_date" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "import_batch" TEXT,
    "journal_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investments_entity_id_name_key" ON "investments"("entity_id", "name");

-- CreateIndex
CREATE INDEX "investments_entity_id_idx" ON "investments"("entity_id");

-- CreateIndex
CREATE INDEX "investment_payments_investment_id_idx" ON "investment_payments"("investment_id");

-- CreateIndex
CREATE INDEX "investment_payments_entity_id_idx" ON "investment_payments"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "investment_payments_journal_entry_id_key" ON "investment_payments"("journal_entry_id");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_payments" ADD CONSTRAINT "investment_payments_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_payments" ADD CONSTRAINT "investment_payments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_payments" ADD CONSTRAINT "investment_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
