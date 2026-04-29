import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");

  const periods = await prisma.pettyCashPeriod.findMany({
    where: entityId && entityId !== "consolidated" ? { entityId } : {},
    orderBy: { periodStart: "desc" },
    take: 3,
    include: {
      entity: { select: { name: true } },
      entries: {
        orderBy: { date: "desc" },
        include: { creator: { select: { fullName: true } } },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: periods.map((p) => ({
      id: p.id,
      entityName: p.entity.name,
      periodStart: p.periodStart.toISOString().split("T")[0],
      periodEnd: p.periodEnd.toISOString().split("T")[0],
      floatAmount: Number(p.floatAmount),
      currency: p.currency,
      isClosed: p.isClosed,
      entries: p.entries.map((e) => ({
        id: e.id,
        date: e.date.toISOString().split("T")[0],
        description: e.description,
        amount: Number(e.amount),
        txnType: e.txnType,
        hasReceipt: !!e.receiptUrl,
        createdBy: e.creator?.fullName || "System",
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { periodId, entityId, date, description, amount, txnType, receiptUrl } = body;

    if (!periodId || !description || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (txnType === "FLOAT_TOPUP" && session.role === "ENTRY_MANAGER") {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }

    const entry = await prisma.pettyCashEntry.create({
      data: {
        periodId,
        entityId,
        date: new Date(date),
        description,
        amount,
        txnType: txnType || "CASH_EXPENSE",
        receiptUrl: receiptUrl || null,
        createdById: session.id,
      },
    });

    revalidateTag("petty-cash");
    revalidateTag("dashboard");
    return NextResponse.json({ success: true, data: { id: entry.id } });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Petty cash error:", errorMessage, err);
    return NextResponse.json({
      error: errorMessage || "Internal error",
      debug: process.env.NODE_ENV === "development" ? String(err) : undefined
    }, { status: 500 });
  }
}
