import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActiveEntities, getDashboardRows } from "@/lib/queries";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === "ENTRY_MANAGER") redirect("/petty-cash");

  const [entities, rows] = await Promise.all([
    getActiveEntities(),
    getDashboardRows(),
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
