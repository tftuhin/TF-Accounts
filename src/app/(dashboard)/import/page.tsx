import { getSession } from "@/lib/auth";
import { getActiveEntities, getActiveBankAccounts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await getSession();
  if (!session) return null;

  const [entityRows, bankAccountRows, ownershipRegistryRows] = await Promise.all([
    getActiveEntities(),
    getActiveBankAccounts(),
    prisma.ownershipRegistry.findMany({
      select: { id: true, ownerName: true },
      orderBy: { ownerName: "asc" },
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

  const ownershipRegistries = ownershipRegistryRows.map((o) => ({
    id: o.id,
    ownerName: o.ownerName,
  }));

  return (
    <ImportClient
      entities={entities}
      bankAccounts={bankAccounts}
      ownershipRegistries={ownershipRegistries}
    />
  );
}
