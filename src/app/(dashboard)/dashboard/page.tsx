import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  if (!supabaseServer) {
    return <div>Supabase not configured</div>;
  }

  // Fetch entities
  const { data: entities } = await supabaseServer
    .from("entities")
    .select("*, pf_ratio_versions!inner(quarter, profit_pct, owner_comp_pct, tax_pct, opex_pct)")
    .eq("pf_ratio_versions.is_current", true)
    .order("type", { ascending: true });

  // Fetch recent transactions (last 4 months)
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  const { data: entryLines } = await supabaseServer
    .from("journal_entry_lines")
    .select(`
      *,
      journal_entries!inner(date, status, entity_id),
      entities(id, name, slug, color)
    `)
    .eq("journal_entries.status", "FINALIZED")
    .gte("journal_entries.date", fourMonthsAgo.toISOString().split("T")[0]);

  // Compute PF balances
  const pfBalances: Record<string, Record<string, { opening: number; deposits: number; withdrawals: number; balance: number }>> = {};
  const entityMonthly: Record<string, Record<string, { income: number; expenses: number }>> = {};

  if (entities) {
    for (const entity of entities) {
      pfBalances[entity.id] = {};
      entityMonthly[entity.id] = {};
      for (const pf of ["INCOME", "PROFIT", "OWNERS_COMP", "TAX", "OPEX"]) {
        pfBalances[entity.id][pf] = { opening: 0, deposits: 0, withdrawals: 0, balance: 0 };
      }
    }
  }

  if (entryLines) {
    for (const line of entryLines) {
      const eid = (line.journal_entries as any).entity_id;
      if (!line.pf_account || !pfBalances[eid]) continue;

      const pf = line.pf_account;
      const amt = Number(line.amount);

      if (line.entry_type === "CREDIT") {
        pfBalances[eid][pf].deposits += amt;
        pfBalances[eid][pf].balance += amt;
      } else {
        pfBalances[eid][pf].withdrawals += amt;
        pfBalances[eid][pf].balance -= amt;
      }

      const monthKey = (line.journal_entries as any).date.slice(0, 7);
      if (!entityMonthly[eid][monthKey]) entityMonthly[eid][monthKey] = { income: 0, expenses: 0 };

      if (pf === "INCOME" && line.entry_type === "CREDIT") {
        entityMonthly[eid][monthKey].income += amt;
      } else if (pf === "OPEX" && line.entry_type === "DEBIT") {
        entityMonthly[eid][monthKey].expenses += amt;
      }
    }
  }

  // Fetch bank accounts
  const { data: bankAccounts } = await supabaseServer
    .from("bank_accounts")
    .select("*")
    .eq("is_active", true)
    .order("account_type", { ascending: true });

  // Fetch recent transactions
  const { data: recentTransactions } = await supabaseServer
    .from("journal_entries")
    .select(`
      *,
      entities(name, slug, color),
      journal_entry_lines(pf_account, entry_type, amount),
      evidence_files(id)
    `)
    .order("date", { ascending: false })
    .limit(20);

  const serializedData = {
    entities: (entities || []).map((e: any) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      type: e.type,
      color: e.color,
      currentRatios: e.pf_ratio_versions?.[0]
        ? {
            quarter: e.pf_ratio_versions[0].quarter,
            profitPct: Number(e.pf_ratio_versions[0].profit_pct),
            ownerCompPct: Number(e.pf_ratio_versions[0].owner_comp_pct),
            taxPct: Number(e.pf_ratio_versions[0].tax_pct),
            opexPct: Number(e.pf_ratio_versions[0].opex_pct),
          }
        : null,
    })),
    pfBalances,
    entityMonthly: Object.fromEntries(
      Object.entries(entityMonthly).map(([eid, months]) => [
        eid,
        Object.entries(months)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({ month, ...data })),
      ])
    ),
    recentTransactions: (recentTransactions || []).map((t: any) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      entityName: t.entities?.name,
      entityColor: t.entities?.color,
      status: t.status,
      category: t.category,
      hasReceipt: (t.evidence_files?.length || 0) > 0 || !!t.receipt_url,
      lines: (t.journal_entry_lines || []).map((l: any) => ({
        pfAccount: l.pf_account,
        entryType: l.entry_type,
        amount: Number(l.amount),
      })),
    })),
    bankAccounts: (bankAccounts || []).map((ba: any) => ({
      id: ba.id,
      accountName: ba.account_name,
      accountType: ba.account_type,
      currency: ba.currency,
      bankName: ba.bank_name,
    })),
  };

  return <DashboardClient data={serializedData} userRole={session.role} />;
}
