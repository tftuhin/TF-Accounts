import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";
import { ensureBasicAccounts } from "@/lib/accounts";
import { TxnType } from "@prisma/client";

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
        note: validated.note || null,
        createdBy: session.id,
      },
    });

    // Create GL journal entries for cross-entity transfers so cash balances update correctly.
    // Same-entity transfers have no net cash effect on that entity, so no GL entry is needed.
    const toEntityId = toAccount.entityId;
    if (fromAccount.entityId !== toEntityId) {
      const rate = validated.exchangeRate ?? 1;
      const amountFromBDT = validated.currencyFrom === "BDT" ? validated.amountFrom : validated.amountFrom * rate;
      const amountToBDT   = validated.currencyTo   === "BDT" ? validated.amountTo   : validated.amountTo * rate;
      const transferDate  = new Date(validated.date);
      const memo = validated.note ? `: ${validated.note}` : "";
      const ref  = validated.reference ? ` [${validated.reference}]` : "";
      const desc = `Fund transfer${ref}${memo}`;

      const [fromAccounts, toAccounts] = await Promise.all([
        ensureBasicAccounts(fromAccount.entityId),
        ensureBasicAccounts(toEntityId),
      ]);

      await Promise.all([
        // From entity: cash goes out (Credit Cash, Debit Inter-entity)
        prisma.journalEntry.create({
          data: {
            entityId: fromAccount.entityId,
            date: transferDate,
            description: desc,
            status: "FINALIZED",
            category: "Fund Transfer",
            createdById: session.id,
            createdByRole: session.role,
            lines: {
              create: [
                {
                  accountId: fromAccounts.interEntity.id,
                  pfAccount: null,
                  entryType: TxnType.DEBIT,
                  amount: amountFromBDT,
                  currency: validated.currencyFrom,
                  usdAmount: validated.currencyFrom === "USD" ? validated.amountFrom : null,
                  entityId: fromAccount.entityId,
                  memo: `Transfer out${ref}`,
                },
                {
                  accountId: fromAccounts.cash.id,
                  pfAccount: null,
                  entryType: TxnType.CREDIT,
                  amount: amountFromBDT,
                  currency: validated.currencyFrom,
                  usdAmount: validated.currencyFrom === "USD" ? validated.amountFrom : null,
                  entityId: fromAccount.entityId,
                  memo: `Transfer out${ref}`,
                },
              ],
            },
          },
        }),
        // To entity: cash comes in (Debit Cash, Credit Inter-entity)
        prisma.journalEntry.create({
          data: {
            entityId: toEntityId,
            date: transferDate,
            description: desc,
            status: "FINALIZED",
            category: "Fund Transfer",
            createdById: session.id,
            createdByRole: session.role,
            lines: {
              create: [
                {
                  accountId: toAccounts.cash.id,
                  pfAccount: null,
                  entryType: TxnType.DEBIT,
                  amount: amountToBDT,
                  currency: validated.currencyTo,
                  usdAmount: validated.currencyTo === "USD" ? validated.amountTo : null,
                  entityId: toEntityId,
                  memo: `Transfer in${ref}`,
                },
                {
                  accountId: toAccounts.interEntity.id,
                  pfAccount: null,
                  entryType: TxnType.CREDIT,
                  amount: amountToBDT,
                  currency: validated.currencyTo,
                  usdAmount: validated.currencyTo === "USD" ? validated.amountTo : null,
                  entityId: toEntityId,
                  memo: `Transfer in${ref}`,
                },
              ],
            },
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: fundTransfer.id,
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
