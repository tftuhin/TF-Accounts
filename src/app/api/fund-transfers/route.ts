import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { TxnType } from "@prisma/client";
import { z } from "zod";

const CreateFundTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amountFrom: z.number().positive(),
  currencyFrom: z.enum(["USD", "BDT"]),
  amountTo: z.number().positive(),
  currencyTo: z.enum(["USD", "BDT"]),
  exchangeRate: z.number().optional(),
  date: z.string().datetime(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CreateFundTransferSchema.parse(body);

    // Get bank account details
    const fromAccount = await prisma.bankAccount.findUnique({
      where: { id: validated.fromAccountId },
      select: { id: true, entityId: true },
    });

    const toAccount = await prisma.bankAccount.findUnique({
      where: { id: validated.toAccountId },
      select: { id: true, entityId: true },
    });

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    // Use the entity from the "from" account
    const entityId = fromAccount.entityId;

    // Create journal entry for the transfer
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entityId,
        date: new Date(validated.date),
        description: `Fund Transfer: ${validated.currencyFrom} → ${validated.currencyTo}`,
        status: "FINALIZED",
        category: "Fund Transfer",
        reference: validated.reference || null,
        createdById: session.id,
        createdByRole: session.role,
        lines: {
          create: [
            // Credit source account (money out)
            {
              accountId: (
                await prisma.chartOfAccounts.findFirst({
                  where: { entityId, accountCode: "1000" },
                  select: { id: true },
                })
              )!.id,
              entryType: TxnType.CREDIT,
              amount: new Decimal(validated.amountFrom.toString()),
              currency: validated.currencyFrom,
              entityId,
              memo: `Transfer out: ${validated.reference || ""}`,
            },
            // Debit destination account (money in)
            {
              accountId: (
                await prisma.chartOfAccounts.findFirst({
                  where: { entityId, accountCode: "1000" },
                  select: { id: true },
                })
              )!.id,
              entryType: TxnType.DEBIT,
              amount: new Decimal(validated.amountTo.toString()),
              currency: validated.currencyTo,
              entityId,
              memo: `Transfer in: ${validated.reference || ""}`,
            },
          ],
        },
      },
    });

    // Create fund transfer record
    const fundTransfer = await prisma.fundTransfer.create({
      data: {
        entityId,
        fromAccountId: validated.fromAccountId,
        toAccountId: validated.toAccountId,
        amountFrom: new Decimal(validated.amountFrom.toString()),
        currencyFrom: validated.currencyFrom,
        amountTo: new Decimal(validated.amountTo.toString()),
        currencyTo: validated.currencyTo,
        exchangeRate: validated.exchangeRate ? new Decimal(validated.exchangeRate.toString()) : null,
        date: new Date(validated.date),
        reference: validated.reference || null,
        journalEntryId: journalEntry.id,
        note: validated.note || null,
        createdBy: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: fundTransfer.id,
        journalEntryId: journalEntry.id,
      },
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 }
      );
    }
    console.error("Fund transfer error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const transfers = await prisma.fundTransfer.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      fromAccount: { select: { accountName: true, accountType: true, currency: true } },
      toAccount: { select: { accountName: true, accountType: true, currency: true } },
      entity: { select: { name: true } },
      creator: { select: { fullName: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: transfers.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split("T")[0],
      fromAccount: t.fromAccount.accountName,
      fromType: t.fromAccount.accountType,
      toAccount: t.toAccount.accountName,
      toType: t.toAccount.accountType,
      amountFrom: Number(t.amountFrom),
      currencyFrom: t.currencyFrom,
      amountTo: Number(t.amountTo),
      currencyTo: t.currencyTo,
      exchangeRate: t.exchangeRate ? Number(t.exchangeRate) : null,
      entityName: t.entity.name,
      reference: t.reference,
      createdBy: t.creator?.fullName || "System",
    })),
  });
}
