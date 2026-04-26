import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

export const revalidate = 60;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "ENTRY_MANAGER") redirect("/petty-cash");

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);

  // Parallel: entities + aggregated monthly totals via one SQL GROUP BY (no in-memory loop)
  const [entities, rows] = await Promise.all([
    prisma.entity.findMany({
      where: { isActive: true },
      orderBy: { type: "asc" },
      select: { id: true, slug: true, name: true, type: true, color: true, parentId: true },
    }),
    prisma.$queryRaw<{
      entity_id: string;
      pf_account: string;
      entry_type: string;
      month_key: string;
      total: number;
    }[]>`
      SELECT
        jel.entity_id,
        jel.pf_account,
        jel.entry_type,
        TO_CHAR(je.date, 'YYYY-MM') AS month_key,
        SUM(jel.amount)::float8       AS total
      FROM journal_entry_lines  jel
      JOIN journal_entries       je  ON je.id = jel.journal_entry_id
      WHERE je.status  = 'FINALIZED'
        AND je.date   >= ${startDate}
        AND jel.pf_account IN ('INCOME', 'OPEX')
      GROUP BY jel.entity_id, jel.pf_account, jel.entry_type,
               TO_CHAR(je.date, 'YYYY-MM')
    `,
  ]);

  // Build monthlyByEntity from the aggregated rows
  const map: Record<string, Record<string, { income: number; expenses: number }>> = {};
  for (const row of rows) {
    const { entity_id: eid, month_key, pf_account, entry_type, total } = row;
    if (!map[eid]) map[eid] = {};
    if (!map[eid][month_key]) map[eid][month_key] = { income: 0, expenses: 0 };
    if (pf_account === "INCOME" && entry_type === "CREDIT") map[eid][month_key].income += total;
    else if (pf_account === "OPEX"   && entry_type === "DEBIT")  map[eid][month_key].expenses += total;
  }

  const monthlyByEntity = Object.fromEntries(
    Object.entries(map).map(([eid, months]) => [
      eid,
      Object.entries(months).map(([month, d]) => ({ month, ...d })),
    ])
  );

  return (
    <DashboardClient
      entities={entities}
      monthlyByEntity={monthlyByEntity}
      userRole={session.role}
    />
  );
}
