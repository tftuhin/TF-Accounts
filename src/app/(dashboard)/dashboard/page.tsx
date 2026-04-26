import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  if (!supabaseServer) return <div>Supabase not configured</div>;

  // Fetch entities
  const { data: entities } = await supabaseServer
    .from("entities")
    .select("id, slug, name, type, color, parent_id")
    .eq("is_active", true)
    .order("type", { ascending: true });

  // Fetch all journal entry lines for the past 13 months (enough for a full year view)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);

  const { data: entryLines } = await supabaseServer
    .from("journal_entry_lines")
    .select(`
      pf_account,
      entry_type,
      amount,
      entity_id,
      journal_entries!inner(date, status, entity_id)
    `)
    .eq("journal_entries.status", "FINALIZED")
    .gte("journal_entries.date", startDate.toISOString().split("T")[0]);

  // Build monthly income/expense data per entity
  // income = CREDIT lines on INCOME pf_account
  // expenses = DEBIT lines on OPEX pf_account
  const monthlyByEntity: Record<string, Record<string, { income: number; expenses: number }>> = {};

  if (entryLines) {
    for (const line of entryLines) {
      const eid = line.entity_id as string;
      const monthKey = (line.journal_entries as any).date.slice(0, 7);

      if (!monthlyByEntity[eid]) monthlyByEntity[eid] = {};
      if (!monthlyByEntity[eid][monthKey]) monthlyByEntity[eid][monthKey] = { income: 0, expenses: 0 };

      const amt = Number(line.amount);
      if (line.pf_account === "INCOME" && line.entry_type === "CREDIT") {
        monthlyByEntity[eid][monthKey].income += amt;
      } else if (line.pf_account === "OPEX" && line.entry_type === "DEBIT") {
        monthlyByEntity[eid][monthKey].expenses += amt;
      }
    }
  }

  // Serialize monthly data
  const serializedMonthly = Object.fromEntries(
    Object.entries(monthlyByEntity).map(([eid, months]) => [
      eid,
      Object.entries(months).map(([month, d]) => ({ month, ...d })),
    ])
  );

  return (
    <DashboardClient
      entities={(entities || []).map((e: any) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        type: e.type,
        color: e.color,
        parentId: e.parent_id,
      }))}
      monthlyByEntity={serializedMonthly}
    />
  );
}
