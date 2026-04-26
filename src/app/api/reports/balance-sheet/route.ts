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

  const lines = await prisma.journalEntryLine.findMany({
    where: { journalEntry: where },
    select: { pfAccount: true, entryType: true, amount: true, currency: true },
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const line of lines) {
    const amt = Number(line.amount);
    if (line.pfAccount === "INCOME" && line.entryType === "CREDIT") totalIncome += amt;
    else if (line.pfAccount === "OPEX" && line.entryType === "DEBIT") totalExpenses += amt;
  }

  // Petty cash balance within the date range
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
  const bankBalance = Math.max(0, equity - Math.max(0, pettyCashBalance));

  return NextResponse.json({
    success: true,
    data: {
      entityName,
      from: from || null,
      to,
      assets: [
        { label: "Bank Accounts (estimated)", amount: bankBalance, currency: "USD" },
        { label: "Petty Cash (BDT)", amount: Math.max(0, pettyCashBalance), currency: "BDT" },
      ],
      totalAssets: bankBalance + Math.max(0, pettyCashBalance),
      equity,
    },
  });
}
