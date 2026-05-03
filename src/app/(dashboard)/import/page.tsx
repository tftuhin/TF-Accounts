import { getSession } from "@/lib/auth";
import { getActiveBankAccounts } from "@/lib/queries";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await getSession();
  if (!session) return null;

  const bankAccountRows = await getActiveBankAccounts();
  const bankAccounts = bankAccountRows.map((a) => ({
    id: a.id,
    accountName: a.accountName,
    accountType: a.accountType,
    currency: a.currency,
    entityId: a.entityId,
    entityName: a.entity.name,
  }));

  return <ImportClient bankAccounts={bankAccounts} />;
}
