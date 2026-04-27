import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TxnType } from "@prisma/client";

const CreateTransactionSchema = z.object({
  entityId: z.string().uuid(),
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string(),
  pfAccount: z.enum(["INCOME", "PROFIT", "OWNERS_COMP", "TAX", "OPEX"]),
  type: z.enum(["income", "expense"]),
  receiptUrl: z.string().optional().nullable(),
  splitEnabled: z.boolean().optional(),
  splits: z.record(z.number()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const where = entityId && entityId !== "consolidated" ? { entityId } : {};

  const [transactions, count] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        entity: { select: { name: true, slug: true, color: true } },
        lines: { select: { pfAccount: true, entryType: true, amount: true, currency: true } },
        evidenceFiles: { select: { id: true, fileName: true } },
        creator: { select: { fullName: true } },
      },
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      transactions: transactions.map((t) => ({
        id: t.id,
        date: t.date.toISOString().split("T")[0],
        description: t.description,
        entityName: t.entity.name,
        entityColor: t.entity.color,
        status: t.status,
        category: t.category,
        hasReceipt: t.evidenceFiles.length > 0 || !!t.receiptUrl,
        createdBy: t.creator?.fullName || "System",
        lines: t.lines.map((l) => ({
          pfAccount: l.pfAccount,
          entryType: l.entryType,
          amount: Number(l.amount),
          currency: l.currency,
        })),
      })),
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateTransactionSchema.parse(body);

    // Find the cash/bank account and the PF account in the chart
    const [cashAccount, pfChartAccount, currentRatio] = await Promise.all([
      prisma.chartOfAccounts.findFirst({
        where: { entityId: data.entityId, accountCode: "1000" },
      }),
      prisma.chartOfAccounts.findFirst({
        where: { entityId: data.entityId, pfAccount: data.pfAccount },
      }),
      prisma.pfRatioVersion.findFirst({
        where: { entityId: data.entityId, isCurrent: true },
      }),
    ]);

    if (!cashAccount || !pfChartAccount) {
      return NextResponse.json({ error: "Chart of accounts not configured for this entity" }, { status: 400 });
    }

    // Create double-entry journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entityId: data.entityId,
        date: new Date(data.date),
        description: data.description,
        status: "FINALIZED",
        category: data.category,
        receiptUrl: data.receiptUrl || null,
        createdById: session.id,
        createdByRole: session.role,
        pfRatioVersionId: currentRatio?.id,
        isSplit: data.splitEnabled || false,
        lines: {
          create: data.type === "income"
            ? [
                { accountId: cashAccount.id, pfAccount: null, entryType: TxnType.DEBIT, amount: data.amount, entityId: data.entityId },
                { accountId: pfChartAccount.id, pfAccount: data.pfAccount, entryType: TxnType.CREDIT, amount: data.amount, entityId: data.entityId },
              ]
            : [
                { accountId: pfChartAccount.id, pfAccount: data.pfAccount, entryType: TxnType.DEBIT, amount: data.amount, entityId: data.entityId },
                { accountId: cashAccount.id, pfAccount: null, entryType: TxnType.CREDIT, amount: data.amount, entityId: data.entityId },
              ],
        },
      },
      include: { lines: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userRole: session.role,
        action: "create",
        tableName: "journal_entries",
        recordId: journalEntry.id,
        newData: { description: data.description, amount: data.amount, type: data.type },
      },
    });

    return NextResponse.json({ success: true, data: { id: journalEntry.id } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error("Transaction creation error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
