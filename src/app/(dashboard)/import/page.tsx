import { getSession } from "@/lib/auth";
import { getActiveEntities, getActiveBankAccounts } from "@/lib/queries";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await getSession();
  if (!session) return null;

  const [entityRows, bankAccountRows] = await Promise.all([
    getActiveEntities(),
    getActiveBankAccounts(),
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

  return <ImportClient entities={entities} bankAccounts={bankAccounts} />;
}
