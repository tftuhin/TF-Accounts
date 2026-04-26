import { prisma } from "@/lib/prisma";

// Auto-creates essential chart_of_accounts entries for an entity if they don't exist.
// Called before creating income/expense journal entries.
export async function ensureBasicAccounts(entityId: string) {
  const defaults = [
    { code: "1000", name: "Cash & Bank",         group: "asset",   pf: null      },
    { code: "4000", name: "Revenue / Income",    group: "revenue", pf: "INCOME"  },
    { code: "5000", name: "Operating Expenses",  group: "expense", pf: "OPEX"    },
  ] as const;

  for (const d of defaults) {
    await prisma.chartOfAccounts.upsert({
      where: { entityId_accountCode: { entityId, accountCode: d.code } },
      update: {},
      create: {
        entityId,
        accountCode: d.code,
        accountName: d.name,
        accountGroup: d.group,
        pfAccount: d.pf as any,
        isActive: true,
      },
    });
  }

  const [cash, income, opex] = await Promise.all([
    prisma.chartOfAccounts.findUnique({ where: { entityId_accountCode: { entityId, accountCode: "1000" } } }),
    prisma.chartOfAccounts.findUnique({ where: { entityId_accountCode: { entityId, accountCode: "4000" } } }),
    prisma.chartOfAccounts.findUnique({ where: { entityId_accountCode: { entityId, accountCode: "5000" } } }),
  ]);

  return { cash: cash!, income: income!, opex: opex! };
}
