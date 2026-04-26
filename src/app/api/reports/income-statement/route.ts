import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AggRow = { pf_account: string; entry_type: string; category: string | null; total: number };

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const fromDate = new Date(from);
  const toDate   = new Date(to);
  const isConsolidated = !entityId || entityId === "consolidated";

  // Single aggregation query replaces loading all entries + JS loops
  const rows: AggRow[] = isConsolidated
    ? await prisma.$queryRaw<AggRow[]>`
        SELECT jel.pf_account, jel.entry_type, je.category,
               SUM(jel.amount)::float8 AS total
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        WHERE je.status = 'FINALIZED'
          AND je.date >= ${fromDate} AND je.date <= ${toDate}
          AND jel.pf_account IN ('INCOME', 'OPEX')
        GROUP BY jel.pf_account, jel.entry_type, je.category
      `
    : await prisma.$queryRaw<AggRow[]>`
        SELECT jel.pf_account, jel.entry_type, je.category,
               SUM(jel.amount)::float8 AS total
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        WHERE je.status = 'FINALIZED'
          AND je.date >= ${fromDate} AND je.date <= ${toDate}
          AND je.entity_id = ${entityId}
          AND jel.pf_account IN ('INCOME', 'OPEX')
        GROUP BY jel.pf_account, jel.entry_type, je.category
      `;

  let totalIncome = 0;
  let totalExpenses = 0;
  const expenseByCategory: Record<string, number> = {};

  for (const row of rows) {
    const amt = row.total;
    if (row.pf_account === "INCOME" && row.entry_type === "CREDIT") {
      totalIncome += amt;
    } else if (row.pf_account === "OPEX" && row.entry_type === "DEBIT") {
      totalExpenses += amt;
      expenseByCategory[row.category || "Other"] = (expenseByCategory[row.category || "Other"] || 0) + amt;
    }
  }

  let entityName = "Consolidated";
  if (!isConsolidated) {
    const entity = await prisma.entity.findUnique({ where: { id: entityId! }, select: { name: true } });
    entityName = entity?.name ?? entityId!;
  }

  return NextResponse.json({
    success: true,
    data: {
      entityName, from, to,
      income:   { total: totalIncome,   currency: "BDT" },
      expenses: {
        total: totalExpenses, currency: "BDT",
        byCategory: Object.entries(expenseByCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => ({ category, amount })),
      },
      grossProfit: totalIncome - totalExpenses,
      netProfit:   totalIncome - totalExpenses,
    },
  });
}
