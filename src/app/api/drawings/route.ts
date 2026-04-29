import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TxnType } from "@prisma/client";
import { ensureBasicAccounts } from "@/lib/accounts";

const CreateDrawingSchema = z.object({
  entityId: z.string().uuid(),
  ownershipRegistryId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  sourceAccount: z.enum(["PROFIT", "OWNERS_COMP"]),
  amount: z.number().positive(),
  date: z.string(),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  const where = entityId && entityId !== "consolidated" ? { entityId } : {};

  const drawings = await prisma.drawing.findMany({
    where,
    orderBy: { date: "desc" },
    take: 30,
    include: {
      entity: { select: { name: true, color: true } },
      ownershipRegistry: { select: { ownerName: true, ownershipPct: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: drawings.map((d) => ({
      id: d.id,
      date: d.date.toISOString().split("T")[0],
      entityName: d.entity.name,
      entityColor: d.entity.color,
      ownerName: d.ownershipRegistry.ownerName,
      ownershipPct: Number(d.ownershipRegistry.ownershipPct),
      sourceAccount: d.sourceAccount,
      amount: Number(d.amount),
      currency: d.currency,
      status: d.status,
      balanceAtDraw: d.accountBalanceAtDraw ? Number(d.accountBalanceAtDraw) : null,
      note: d.note,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateDrawingSchema.parse(body);

    // Calculate current balance of source PF account
    const lines = await prisma.journalEntryLine.findMany({
      where: {
        entityId: data.entityId,
        pfAccount: data.sourceAccount,
        journalEntry: { status: "FINALIZED" },
      },
      select: { entryType: true, amount: true },
    });

    const currentBalance = lines.reduce((sum, l) => {
      const amt = Number(l.amount);
      return sum + (l.entryType === "CREDIT" ? amt : -amt);
    }, 0);

    const registryId = data.ownershipRegistryId || data.ownerId;
    if (!registryId) return NextResponse.json({ error: "ownershipRegistryId or ownerId required" }, { status: 400 });

    // Get owner details for GL memo
    const ownershipRegistry = await prisma.ownershipRegistry.findUnique({
      where: { id: registryId },
      select: { ownerName: true },
    });

    const ownerName = ownershipRegistry?.ownerName || "Unknown Owner";

    // Ensure basic accounts exist
    const accounts = await ensureBasicAccounts(data.entityId);

    // Create journal entry for the drawing (debit equity/drawings, credit cash)
    const drawingDate = new Date(data.date);
    const sourceLabel = data.sourceAccount === "PROFIT" ? "Profit" : "Owners Compensation";

    const journalEntry = await prisma.journalEntry.create({
      data: {
        entityId: data.entityId,
        date: drawingDate,
        description: `Drawing by ${ownerName} from ${sourceLabel}`,
        status: "FINALIZED",
        category: "Owner Drawing",
        ...(session.id ? { createdById: session.id } : {}),
        createdByRole: session.role,
        lines: {
          create: [
            // Debit Drawings (reduces equity; account 6000 tracks owner withdrawals)
            {
              accountId: accounts.drawings.id,
              pfAccount: data.sourceAccount,
              entryType: TxnType.DEBIT,
              amount: data.amount,
              currency: "BDT",
              entityId: data.entityId,
              memo: `${ownerName} drawing from ${sourceLabel}${data.note ? `: ${data.note}` : ""}`,
            },
            // Credit Cash account (money withdrawn)
            {
              accountId: accounts.cash.id,
              pfAccount: null,
              entryType: TxnType.CREDIT,
              amount: data.amount,
              currency: "BDT",
              entityId: data.entityId,
              memo: `Funds withdrawn - ${ownerName}`,
            },
          ],
        },
      },
    });

    const drawing = await prisma.drawing.create({
      data: {
        entityId: data.entityId,
        ownershipRegistryId: registryId,
        sourceAccount: data.sourceAccount,
        amount: data.amount,
        date: drawingDate,
        status: data.amount > currentBalance ? "PENDING" : "COMPLETED",
        note: data.note,
        accountBalanceAtDraw: currentBalance,
        createdById: null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        userRole: session.role,
        action: "create",
        tableName: "drawings",
        recordId: drawing.id,
        newData: { amount: data.amount, sourceAccount: data.sourceAccount, balanceAtDraw: currentBalance, journalEntryId: journalEntry.id },
      },
    });

    revalidateTag("drawings");
    revalidateTag("pf-balances");
    revalidateTag("dashboard");

    const exceeded = data.amount > currentBalance;

    return NextResponse.json({
      success: true,
      data: { id: drawing.id, exceeded, currentBalance, journalEntryId: journalEntry.id },
      ...(exceeded ? { warning: `Drawing exceeds ${data.sourceAccount} balance of $${currentBalance.toFixed(2)}` } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error("Drawing creation error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
