import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/rbac";
import { IncomeClient } from "./income-client";

export default async function IncomePage() {
  const session = await getSession();
  if (!session || !canAccess(session.role, "income")) {
    return <div className="card p-10 text-center text-ink-faint">Access denied.</div>;
  }

  const [entities, bankAccounts] = await Promise.all([
    prisma.entity.findMany({
      where: { isActive: true },
      orderBy: { type: "asc" },
      select: { id: true, slug: true, name: true, type: true, color: true },
    }),
    prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { accountType: "asc" },
      select: { id: true, accountName: true, accountType: true, currency: true, bankName: true, entityId: true },
    }),
  ]);

  return <IncomeClient entities={entities} bankAccounts={bankAccounts} userRole={session.role} />;
}
