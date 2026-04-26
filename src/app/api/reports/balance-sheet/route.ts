import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const asOf = searchParams.get("asOf") || new Date().toISOString().split("T")[0];

  const where: any = {
    status: "FINALIZED",
    date: { lte: new Date(asOf) },
    ...(entityId && entityId !== "consolidated" ? { entityId } : {}),
  };

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: where,
    },
    include: {
      journalEntry: { select: { entityId: true } },
    },
    select: { pfAccount: true, entryType: true, amount: true, currency: true, journalEntry: true },
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  let pettyCashBalance = 0;

  for (const line of lines) {
    const amt = Number(line.amount);
    if (line.pfAccount === "INCOME" && line.entryType === "CREDIT") totalIncome += amt;
    else if (line.pfAccount === "OPEX" && line.entryType === "DEBIT") totalExpenses += amt;
  }

  // Petty cash balance
  const pettyCashEntries = await prisma.pettyCashEntry.findMany({
    where: {
      date: { lte: new Date(asOf) },
      ...(entityId && entityId !== "consolidated" ? { entityId } : {}),
    },
    select: { txnType: true, amount: true },
  });

  for (const e of pettyCashEntries) {
    const amt = Number(e.amount);
    if (e.txnType === "FLOAT_TOPUP") pettyCashBalance += amt;
    else if (e.txnType === "ATM_WITHDRAWAL" || e.txnType === "CARD_PAYMENT" || e.txnType === "CASH_EXPENSE") {
      pettyCashBalance -= amt;
    }
  }

  const isConsolidated = !entityId || entityId === "consolidated";
  let entityName = "Consolidated";
  if (!isConsolidated) {
    const entity = await prisma.entity.findUnique({ where: { id: entityId! }, select: { name: true } });
    entityName = entity?.name ?? entityId!;
  }

  const equity = totalIncome - totalExpenses;
  const bankBalance = Math.max(0, equity - pettyCashBalance);

  return NextResponse.json({
    success: true,
    data: {
      entityName,
      asOf,
      assets: [
        { label: "Bank Accounts (estimated)", amount: bankBalance, currency: "USD" },
        { label: "Petty Cash (BDT)", amount: Math.max(0, pettyCashBalance), currency: "BDT" },
      ],
      totalAssets: bankBalance + Math.max(0, pettyCashBalance),
      equity,
    },
  });
}
