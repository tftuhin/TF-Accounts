import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBasicAccounts } from "@/lib/accounts";
import { TxnType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { entityId, date, description, amount, usdAmount, currency, category, subcategory } = await req.json();

    if (!entityId || !date || !description || !amount)
      return NextResponse.json({ error: "entityId, date, description, amount required" }, { status: 400 });

    // `amount` is always BDT (or BDT equivalent for USD transactions)
    // `usdAmount` is set only for USD bank transactions
    const lineCurrency = currency === "USD" ? "USD" : "BDT";

    const accounts = await ensureBasicAccounts(entityId);

    const entry = await prisma.journalEntry.create({
      data: {
        entityId,
        date: new Date(date),
        description,
        status: "FINALIZED",
        category: subcategory ? `${category || "Expense"} › ${subcategory}` : (category || "Expense"),
        createdById: session.id,
        createdByRole: session.role,
        lines: {
          create: [
            // Debit OPEX — amount in BDT (BDT equiv for USD transactions)
            {
              accountId: accounts.opex.id,
              pfAccount: "OPEX",
              entryType: TxnType.DEBIT,
              amount,
              currency: lineCurrency,
              usdAmount: usdAmount ?? null,
              entityId,
            },
            // Credit Cash/Bank
            {
              accountId: accounts.cash.id,
              pfAccount: null,
              entryType: TxnType.CREDIT,
              amount,
              currency: lineCurrency,
              usdAmount: usdAmount ?? null,
              entityId,
            },
          ],
        },
      },
    });

    revalidateTag("dashboard");
    revalidateTag("pf-balances");
    return NextResponse.json({ success: true, data: { id: entry.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const entries = await prisma.journalEntry.findMany({
    where: {
      NOT: { category: "Income" },
      ...(entityId && entityId !== "consolidated" ? { entityId } : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      entity: { select: { name: true, color: true } },
      lines: { where: { pfAccount: "OPEX" }, take: 1, select: { amount: true, currency: true, usdAmount: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString().split("T")[0],
      description: e.description,
      category: e.category,
      entityName: e.entity.name,
      entityColor: e.entity.color,
      amount: e.lines[0] ? Number(e.lines[0].amount) : 0,
      currency: e.lines[0]?.currency ?? "BDT",
      usdAmount: e.lines[0]?.usdAmount ? Number(e.lines[0].usdAmount) : null,
    })),
  });
}
