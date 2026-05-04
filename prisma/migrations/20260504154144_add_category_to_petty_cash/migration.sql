-- AddColumn category to petty_cash_entries
ALTER TABLE "petty_cash_entries" ADD COLUMN "category" TEXT DEFAULT 'Other';
