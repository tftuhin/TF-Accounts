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
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const entityFilter = entityId && entityId !== "consolidated" ? { entityId } : {};

  const where: any = {
    status: "FINALIZED",
    date: {
      ...(from ? { gte: new Date(from) } : {}),
      lte: new Date(to),
    },
    ...entityFilter,
  };

  // All journal entry lines (amount is always BDT or BDT equivalent)
  const lines = await prisma.journalEntryLine.findMany({
    where: { journalEntry: where },
    select: { pfAccount: true, entryType: true, amount: true, currency: true, usdAmount: true },
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  let bdtCashBalance = 0;       // net BDT cash from BDT-currency cash lines
  let usdCashBalanceBDT = 0;    // net cash from USD-currency cash lines (stored as BDT equiv)
  let usdCashBalanceUSD = 0;    // net cash from USD-currency cash lines (actual USD)

  for (const line of lines) {
    const amt = Number(line.amount);
    const usdAmt = line.usdAmount ? Number(line.usdAmount) : 0;
    const sign = line.entryType === "DEBIT" ? 1 : -1;

    if (line.pfAccount === "INCOME" && line.entryType === "CREDIT") {
      totalIncome += amt;
    } else if (line.pfAccount === "OPEX" && line.entryType === "DEBIT") {
      totalExpenses += amt;
    } else if (line.pfAccount === null) {
      // Cash/bank asset lines
      if (line.currency === "BDT") {
        bdtCashBalance += sign * amt;
      } else if (line.currency === "USD") {
        usdCashBalanceBDT += sign * amt;
        usdCashBalanceUSD += sign * usdAmt;
      }
    }
  }

  // Petty cash balance from petty cash entries
  const pettyCashEntries = await prisma.pettyCashEntry.findMany({
    where: {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        lte: new Date(to),
      },
      ...entityFilter,
    },
    select: { txnType: true, amount: true },
  });

  let pettyCashBalance = 0;
  for (const e of pettyCashEntries) {
    const amt = Number(e.amount);
    if (e.txnType === "FLOAT_TOPUP") pettyCashBalance += amt;
    else if (["ATM_WITHDRAWAL", "CARD_PAYMENT", "CASH_EXPENSE"].includes(e.txnType)) {
      pettyCashBalance -= amt;
    }
  }

  let entityName = "Consolidated";
  if (entityId && entityId !== "consolidated") {
    const entity = await prisma.entity.findUnique({ where: { id: entityId }, select: { name: true } });
    entityName = entity?.name ?? entityId;
  }

  const equity = totalIncome - totalExpenses;

  // Build assets list — only include lines with positive balance
  const assets: { label: string; amount: number; currency: string; usdAmount?: number }[] = [];

  if (bdtCashBalance > 0) {
    assets.push({ label: "BDT Bank Accounts", amount: bdtCashBalance, currency: "BDT" });
  }
  if (usdCashBalanceBDT > 0 || usdCashBalanceUSD > 0) {
    assets.push({
      label: "USD Bank Accounts",
      amount: usdCashBalanceBDT,
      currency: "BDT",
      usdAmount: usdCashBalanceUSD,
    });
  }
  if (pettyCashBalance > 0) {
    assets.push({ label: "Petty Cash", amount: pettyCashBalance, currency: "BDT" });
  }

  // Fallback when no cash lines recorded yet — estimate from equity
  if (assets.length === 0 && equity > 0) {
    assets.push({ label: "Bank Accounts (estimated)", amount: equity, currency: "BDT" });
  }

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);

  return NextResponse.json({
    success: true,
    data: { entityName, from: from || null, to, assets, totalAssets, equity },
  });
}
