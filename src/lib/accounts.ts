import { prisma } from "@/lib/prisma";

// Auto-creates essential chart_of_accounts entries for an entity if they don't exist.
// Uses parallel upserts and returns results directly — no extra findUnique round trips.
export async function ensureBasicAccounts(entityId: string) {
  const [cash, income, opex, fixedAssets, accumulatedDepreciation, depreciationExpense, gainOnDisposal, lossOnDisposal] = await Promise.all([
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "1000" } },
      update: {},
      create: { entityId, accountCode: "1000", accountName: "Cash & Bank", accountGroup: "asset", pfAccount: null, isActive: true },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "4000" } },
      update: {},
      create: { entityId, accountCode: "4000", accountName: "Revenue / Income", accountGroup: "revenue", pfAccount: "INCOME" as any, isActive: true },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "5000" } },
      update: {},
      create: { entityId, accountCode: "5000", accountName: "Operating Expenses", accountGroup: "expense", pfAccount: "OPEX" as any, isActive: true },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "1500" } },
      update: {},
      create: { entityId, accountCode: "1500", accountName: "Fixed Assets", accountGroup: "asset", pfAccount: null, isActive: true },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "1510" } },
      update: {},
      create: { entityId, accountCode: "1510", accountName: "Accumulated Depreciation", accountGroup: "asset", pfAccount: null, isActive: true },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "5100" } },
      update: {},
      create: { entityId, accountCode: "5100", accountName: "Depreciation Expense", accountGroup: "expense", pfAccount: null, isActive: true },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "4100" } },
      update: {},
      create: { entityId, accountCode: "4100", accountName: "Gain on Asset Disposal", accountGroup: "revenue", pfAccount: null, isActive: true },
    }),
    prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: "5200" } },
      update: {},
      create: { entityId, accountCode: "5200", accountName: "Loss on Asset Disposal", accountGroup: "expense", pfAccount: null, isActive: true },
    }),
  ]);
  return { cash, income, opex, fixedAssets, accumulatedDepreciation, depreciationExpense, gainOnDisposal, lossOnDisposal };
}
