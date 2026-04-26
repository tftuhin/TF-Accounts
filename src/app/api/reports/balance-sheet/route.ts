import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LineAgg = {
  pf_account: string | null;
  entry_type: string;
  currency: string;
  total: number;
  usd_total: number;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const from = searchParams.get("from");
  const to   = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const fromDate = from ? new Date(from) : null;
  const toDate   = new Date(to);
  const isConsolidated = !entityId || entityId === "consolidated";

  // Single aggregation query for all journal lines
  const lineRows: LineAgg[] = isConsolidated
    ? fromDate
      ? await prisma.$queryRaw<LineAgg[]>`
          SELECT jel.pf_account, jel.entry_type, jel.currency,
                 SUM(jel.amount)::float8     AS total,
                 SUM(COALESCE(jel.usd_amount,0))::float8 AS usd_total
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.journal_entry_id
          WHERE je.status = 'FINALIZED'
            AND je.date >= ${fromDate} AND je.date <= ${toDate}
          GROUP BY jel.pf_account, jel.entry_type, jel.currency
        `
      : await prisma.$queryRaw<LineAgg[]>`
          SELECT jel.pf_account, jel.entry_type, jel.currency,
                 SUM(jel.amount)::float8     AS total,
                 SUM(COALESCE(jel.usd_amount,0))::float8 AS usd_total
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.journal_entry_id
          WHERE je.status = 'FINALIZED'
            AND je.date <= ${toDate}
          GROUP BY jel.pf_account, jel.entry_type, jel.currency
        `
    : fromDate
      ? await prisma.$queryRaw<LineAgg[]>`
          SELECT jel.pf_account, jel.entry_type, jel.currency,
                 SUM(jel.amount)::float8     AS total,
                 SUM(COALESCE(jel.usd_amount,0))::float8 AS usd_total
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.journal_entry_id
          WHERE je.status = 'FINALIZED'
            AND je.entity_id = ${entityId}
            AND je.date >= ${fromDate} AND je.date <= ${toDate}
          GROUP BY jel.pf_account, jel.entry_type, jel.currency
        `
      : await prisma.$queryRaw<LineAgg[]>`
          SELECT jel.pf_account, jel.entry_type, jel.currency,
                 SUM(jel.amount)::float8     AS total,
                 SUM(COALESCE(jel.usd_amount,0))::float8 AS usd_total
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.journal_entry_id
          WHERE je.status = 'FINALIZED'
            AND je.entity_id = ${entityId}
            AND je.date <= ${toDate}
          GROUP BY jel.pf_account, jel.entry_type, jel.currency
        `;

  let totalIncome = 0, totalExpenses = 0;
  let bdtCashBalance = 0, usdCashBalanceBDT = 0, usdCashBalanceUSD = 0;

  for (const row of lineRows) {
    const sign = row.entry_type === "DEBIT" ? 1 : -1;
    if (row.pf_account === "INCOME" && row.entry_type === "CREDIT") totalIncome += row.total;
    else if (row.pf_account === "OPEX" && row.entry_type === "DEBIT") totalExpenses += row.total;
    else if (row.pf_account === null) {
      if (row.currency === "BDT") bdtCashBalance += sign * row.total;
      else if (row.currency === "USD") { usdCashBalanceBDT += sign * row.total; usdCashBalanceUSD += sign * row.usd_total; }
    }
  }

  // Petty cash — aggregated in SQL
  const [pcRow] = isConsolidated
    ? fromDate
      ? await prisma.$queryRaw<{ topup: number; spend: number }[]>`
          SELECT
            SUM(CASE WHEN txn_type = 'FLOAT_TOPUP' THEN amount ELSE 0 END)::float8 AS topup,
            SUM(CASE WHEN txn_type IN ('ATM_WITHDRAWAL','CARD_PAYMENT','CASH_EXPENSE') THEN amount ELSE 0 END)::float8 AS spend
          FROM petty_cash_entries
          WHERE date >= ${fromDate} AND date <= ${toDate}
        `
      : await prisma.$queryRaw<{ topup: number; spend: number }[]>`
          SELECT
            SUM(CASE WHEN txn_type = 'FLOAT_TOPUP' THEN amount ELSE 0 END)::float8 AS topup,
            SUM(CASE WHEN txn_type IN ('ATM_WITHDRAWAL','CARD_PAYMENT','CASH_EXPENSE') THEN amount ELSE 0 END)::float8 AS spend
          FROM petty_cash_entries
          WHERE date <= ${toDate}
        `
    : fromDate
      ? await prisma.$queryRaw<{ topup: number; spend: number }[]>`
          SELECT
            SUM(CASE WHEN txn_type = 'FLOAT_TOPUP' THEN amount ELSE 0 END)::float8 AS topup,
            SUM(CASE WHEN txn_type IN ('ATM_WITHDRAWAL','CARD_PAYMENT','CASH_EXPENSE') THEN amount ELSE 0 END)::float8 AS spend
          FROM petty_cash_entries
          WHERE entity_id = ${entityId} AND date >= ${fromDate} AND date <= ${toDate}
        `
      : await prisma.$queryRaw<{ topup: number; spend: number }[]>`
          SELECT
            SUM(CASE WHEN txn_type = 'FLOAT_TOPUP' THEN amount ELSE 0 END)::float8 AS topup,
            SUM(CASE WHEN txn_type IN ('ATM_WITHDRAWAL','CARD_PAYMENT','CASH_EXPENSE') THEN amount ELSE 0 END)::float8 AS spend
          FROM petty_cash_entries
          WHERE entity_id = ${entityId} AND date <= ${toDate}
        `;

  const pettyCashBalance = (pcRow?.topup ?? 0) - (pcRow?.spend ?? 0);

  let entityName = "Consolidated";
  if (!isConsolidated) {
    const entity = await prisma.entity.findUnique({ where: { id: entityId! }, select: { name: true } });
    entityName = entity?.name ?? entityId!;
  }

  const equity = totalIncome - totalExpenses;

  const assets: { label: string; amount: number; currency: string; usdAmount?: number }[] = [];
  if (bdtCashBalance > 0)
    assets.push({ label: "BDT Bank Accounts", amount: bdtCashBalance, currency: "BDT" });
  if (usdCashBalanceBDT > 0 || usdCashBalanceUSD > 0)
    assets.push({ label: "USD Bank Accounts", amount: usdCashBalanceBDT, currency: "BDT", usdAmount: usdCashBalanceUSD });
  if (pettyCashBalance > 0)
    assets.push({ label: "Petty Cash", amount: pettyCashBalance, currency: "BDT" });
  if (assets.length === 0 && equity > 0)
    assets.push({ label: "Bank Accounts (estimated)", amount: equity, currency: "BDT" });

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);

  return NextResponse.json({
    success: true,
    data: { entityName, from: from || null, to, assets, totalAssets, equity },
  });
}
