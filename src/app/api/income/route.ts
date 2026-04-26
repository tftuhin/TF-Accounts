import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBasicAccounts } from "@/lib/accounts";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { entityId, date, description, amount, bankAccountId } = await req.json();

    if (!entityId || !date || !description || !amount)
      return NextResponse.json({ error: "entityId, date, description, amount required" }, { status: 400 });

    const accounts = await ensureBasicAccounts(entityId);

    const entry = await prisma.journalEntry.create({
      data: {
        entityId,
        date: new Date(date),
        description,
        status: "FINALIZED",
        category: "Income",
        createdById: session.id,
        createdByRole: session.role as any,
        lines: {
          create: [
            // Credit Income account
            {
              accountId: accounts.income.id,
              pfAccount: "INCOME",
              entryType: "CREDIT",
              amount,
              currency: "BDT",
              entityId,
            },
            // Debit Cash/Bank account
            {
              accountId: bankAccountId
                ? await prisma.chartOfAccounts.findFirst({ where: { entityId, accountCode: "1000" } }).then(a => a?.id ?? accounts.cash.id)
                : accounts.cash.id,
              pfAccount: null,
              entryType: "DEBIT",
              amount,
              currency: "BDT",
              entityId,
            },
          ],
        },
      },
    });

    return NextResponse.json({ success: true, data: { id: entry.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "ENTRY_MANAGER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const entries = await prisma.journalEntry.findMany({
    where: {
      category: "Income",
      ...(entityId && entityId !== "consolidated" ? { entityId } : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      entity: { select: { name: true, color: true } },
      lines: { where: { pfAccount: "INCOME" }, take: 1 },
    },
  });

  return NextResponse.json({
    success: true,
    data: entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString().split("T")[0],
      description: e.description,
      entityName: e.entity.name,
      entityColor: e.entity.color,
      amount: e.lines[0] ? Number(e.lines[0].amount) : 0,
      currency: "BDT",
    })),
  });
}
