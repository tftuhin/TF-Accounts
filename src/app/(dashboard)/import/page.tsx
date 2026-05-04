import { getSession } from "@/lib/auth";
import { getActiveEntities, getActiveBankAccounts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await getSession();
  if (!session) return null;

  const [entityRows, bankAccountRows, chartAccountRows] = await Promise.all([
    getActiveEntities(),
    getActiveBankAccounts(),
    prisma.chartOfAccounts.findMany({
      select: {
        id: true,
        entityId: true,
        accountCode: true,
        accountName: true,
        accountGroup: true,
        pfAccount: true,
      },
    }),
  ]);

  const entities = entityRows.map((e) => ({
    id: e.id,
    name: e.name,
  }));

  const bankAccounts = bankAccountRows.map((a) => ({
    id: a.id,
    accountName: a.accountName,
    accountType: a.accountType,
    currency: a.currency,
    entityId: a.entityId,
    entityName: a.entity.name,
  }));

  const chartAccounts = chartAccountRows.map((a) => ({
    id: a.id,
    entityId: a.entityId,
    accountCode: a.accountCode,
    accountName: a.accountName,
    accountGroup: a.accountGroup,
    pfAccount: a.pfAccount || undefined,
  }));

  return <ImportClient entities={entities} bankAccounts={bankAccounts} chartAccounts={chartAccounts} />;
}
