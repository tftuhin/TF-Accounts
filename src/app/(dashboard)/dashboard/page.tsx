import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

export const revalidate = 60;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  // Entry Managers only have access to petty cash
  if (session.role === "ENTRY_MANAGER") redirect("/petty-cash");

  const entities = await prisma.entity.findMany({
    where: { isActive: true },
    orderBy: { type: "asc" },
    select: { id: true, slug: true, name: true, type: true, color: true, parentId: true },
  });

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);

  const entryLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        status: "FINALIZED",
        date: { gte: startDate },
      },
      pfAccount: { in: ["INCOME", "OPEX"] },
    },
    select: {
      entityId: true,
      pfAccount: true,
      entryType: true,
      amount: true,
      journalEntry: { select: { date: true } },
    },
  });

  const monthlyByEntity: Record<string, Record<string, { income: number; expenses: number }>> = {};

  for (const line of entryLines) {
    const eid = line.entityId;
    const monthKey = line.journalEntry.date.toISOString().slice(0, 7);

    if (!monthlyByEntity[eid]) monthlyByEntity[eid] = {};
    if (!monthlyByEntity[eid][monthKey]) monthlyByEntity[eid][monthKey] = { income: 0, expenses: 0 };

    const amt = Number(line.amount);
    if (line.pfAccount === "INCOME" && line.entryType === "CREDIT") {
      monthlyByEntity[eid][monthKey].income += amt;
    } else if (line.pfAccount === "OPEX" && line.entryType === "DEBIT") {
      monthlyByEntity[eid][monthKey].expenses += amt;
    }
  }

  const serializedMonthly = Object.fromEntries(
    Object.entries(monthlyByEntity).map(([eid, months]) => [
      eid,
      Object.entries(months).map(([month, d]) => ({ month, ...d })),
    ])
  );

  return (
    <DashboardClient
      entities={entities.map((e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        type: e.type,
        color: e.color,
        parentId: e.parentId,
      }))}
      monthlyByEntity={serializedMonthly}
    />
  );
}
