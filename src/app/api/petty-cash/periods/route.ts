import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { entityId, periodStart, periodEnd } = await req.json();
    if (!entityId || !periodStart || !periodEnd)
      return NextResponse.json({ error: "entityId, periodStart and periodEnd required" }, { status: 400 });

    // Check if period already exists
    const existing = await prisma.pettyCashPeriod.findUnique({
      where: { entityId_periodStart: { entityId, periodStart: new Date(periodStart) } },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Petty cash period already exists for this entity and date (${existing.periodStart.toISOString().split("T")[0]})` },
        { status: 400 }
      );
    }

    const period = await prisma.pettyCashPeriod.create({
      data: {
        entityId,
        periodStart: new Date(periodStart),
        periodEnd:   new Date(periodEnd),
        floatAmount: 0,
        currency:    "BDT",
      },
    });

    return NextResponse.json({ success: true, data: { id: period.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const periods = await prisma.pettyCashPeriod.findMany({
    orderBy: { periodStart: "desc" },
    include: { entity: { select: { name: true } } },
  });

  return NextResponse.json({
    success: true,
    data: periods.map((p) => ({
      id:          p.id,
      entityId:    p.entityId,
      entityName:  p.entity.name,
      periodStart: p.periodStart.toISOString().split("T")[0],
      periodEnd:   p.periodEnd.toISOString().split("T")[0],
      isClosed:    p.isClosed,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { periodId } = await req.json();
    if (!periodId)
      return NextResponse.json({ error: "periodId required" }, { status: 400 });

    const period = await prisma.pettyCashPeriod.findUnique({
      where: { id: periodId },
      include: { _count: { select: { entries: true } } },
    });

    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    if (period._count.entries > 0) {
      return NextResponse.json(
        { error: `Cannot delete period with ${period._count.entries} entries. Please delete entries first.` },
        { status: 400 }
      );
    }

    await prisma.pettyCashPeriod.delete({
      where: { id: periodId },
    });

    return NextResponse.json({ success: true, message: "Period deleted" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
