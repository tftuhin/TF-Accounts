import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseClient } from "./expense-client";

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session) return null;

  const entities = await prisma.entity.findMany({
    select: { id: true, slug: true, name: true, type: true, color: true },
    orderBy: { type: "asc" },
  });

  return <ExpenseClient entities={entities} userRole={session.role} />;
}
