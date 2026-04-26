import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateDrawingSchema = z.object({
  entityId: z.string().uuid(),
  ownershipRegistryId: z.string().uuid(),
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

    const drawing = await prisma.drawing.create({
      data: {
        entityId: data.entityId,
        ownershipRegistryId: data.ownershipRegistryId,
        sourceAccount: data.sourceAccount,
        amount: data.amount,
        date: new Date(data.date),
        status: data.amount > currentBalance ? "PENDING" : "COMPLETED",
        note: data.note,
        accountBalanceAtDraw: currentBalance,
        createdById: session.id,
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
        newData: { amount: data.amount, sourceAccount: data.sourceAccount, balanceAtDraw: currentBalance },
      },
    });

    const exceeded = data.amount > currentBalance;

    return NextResponse.json({
      success: true,
      data: { id: drawing.id, exceeded, currentBalance },
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
