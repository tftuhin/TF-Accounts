/**
 * Clears ALL data from the database for a fresh start
 * Run with: npx tsx prisma/clear-all.ts
 */
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  console.log("🗑️  Clearing all data...");

  try {
    // Delete in reverse order of dependencies
    await prisma.journalEntryLine.deleteMany({});
    console.log("  ✓ Journal entry lines deleted");

    await prisma.journalEntry.deleteMany({});
    console.log("  ✓ Journal entries deleted");

    await prisma.bankStatementItem.deleteMany({});
    console.log("  ✓ Bank statement items deleted");

    await prisma.bankStatement.deleteMany({});
    console.log("  ✓ Bank statements deleted");

    await prisma.fundTransfer.deleteMany({});
    console.log("  ✓ Fund transfers deleted");

    await prisma.drawing.deleteMany({});
    console.log("  ✓ Drawings deleted");

    await prisma.pettyCashEntry.deleteMany({});
    console.log("  ✓ Petty cash entries deleted");

    await prisma.pettyCashPeriod.deleteMany({});
    console.log("  ✓ Petty cash periods deleted");

    await prisma.salaryIncrement.deleteMany({});
    console.log("  ✓ Salary increments deleted");

    await prisma.salary.deleteMany({});
    console.log("  ✓ Salaries deleted");

    await prisma.employee.deleteMany({});
    console.log("  ✓ Employees deleted");

    await prisma.chartOfAccounts.deleteMany({});
    console.log("  ✓ Chart of accounts deleted");

    await prisma.bankAccount.deleteMany({});
    console.log("  ✓ Bank accounts deleted");

    await prisma.ownershipRegistry.deleteMany({});
    console.log("  ✓ Ownership registry deleted");

    await prisma.entity.deleteMany({});
    console.log("  ✓ Entities deleted");

    console.log("\n✅ All data cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
