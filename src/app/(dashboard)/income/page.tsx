import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { getActiveEntities, getActiveBankAccounts } from "@/lib/queries";
import { IncomeClient } from "./income-client";

export default async function IncomePage() {
  const session = await getSession();
  if (!session || !canAccess(session.role, "income")) {
    return <div className="card p-10 text-center text-ink-faint">Access denied.</div>;
  }

  const [entities, bankAccounts] = await Promise.all([
    getActiveEntities(),
    getActiveBankAccounts(),
  ]);

  return <IncomeClient entities={entities} bankAccounts={bankAccounts.map(b => ({
    id: b.id, accountName: b.accountName, accountType: b.accountType,
    currency: b.currency, bankName: b.bankName, entityId: b.entityId,
  }))} userRole={session.role} />;
}
