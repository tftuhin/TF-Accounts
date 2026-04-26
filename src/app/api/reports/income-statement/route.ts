import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const where: any = {
    status: "FINALIZED",
    date: { gte: new Date(from), lte: new Date(to) },
    ...(entityId && entityId !== "consolidated" ? { entityId } : {}),
  };

  const entries = await prisma.journalEntry.findMany({
    where,
    include: {
      entity: { select: { name: true } },
      lines: { select: { pfAccount: true, entryType: true, amount: true, currency: true } },
    },
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  let primaryCurrency = "USD";
  const expenseByCategory: Record<string, number> = {};

  for (const entry of entries) {
    for (const line of entry.lines) {
      const amt = Number(line.amount);
      if (line.pfAccount === "INCOME" && line.entryType === "CREDIT") {
        totalIncome += amt;
        primaryCurrency = line.currency;
      } else if (line.pfAccount === "OPEX" && line.entryType === "DEBIT") {
        totalExpenses += amt;
        const cat = entry.category || "Other";
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
      }
    }
  }

  const isConsolidated = !entityId || entityId === "consolidated";
  const entityName = isConsolidated
    ? "Consolidated"
    : entries[0]?.entity.name ?? entityId;

  return NextResponse.json({
    success: true,
    data: {
      entityName,
      from,
      to,
      income: { total: totalIncome, currency: primaryCurrency },
      expenses: {
        total: totalExpenses,
        currency: "USD",
        byCategory: Object.entries(expenseByCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => ({ category, amount })),
      },
      grossProfit: totalIncome - totalExpenses,
      netProfit: totalIncome - totalExpenses,
    },
  });
}
