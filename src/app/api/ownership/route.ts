import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getActiveTeamosisRecord, getTotalActiveOwnership } from "@/lib/ownership";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get("entityId");

  if (!entityId) {
    return NextResponse.json({ error: "entityId required" }, { status: 400 });
  }

  const records = await prisma.ownershipRegistry.findMany({
    where: { entityId },
    orderBy: { effectiveFrom: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: records.map((r) => ({
      ...r,
      ownershipPct: Number(r.ownershipPct),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { entityId, ownerName, ownershipPct, effectiveFrom, notes } = body;

  if (!entityId || !ownerName || ownershipPct === undefined || !effectiveFrom) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const pct = Number(ownershipPct);
  if (pct < 1 || pct > 99) {
    return NextResponse.json(
      { error: "Partner ownership must be 1-99% (Teamosis keeps at least 1%)" },
      { status: 400 }
    );
  }

  const fromDate = new Date(effectiveFrom);

  try {
    // Get current active Teamosis record
    const currentTeamosis = await getActiveTeamosisRecord(entityId);
    if (!currentTeamosis) {
      return NextResponse.json(
        { error: "No default Teamosis ownership record found" },
        { status: 400 }
      );
    }

    // Close current Teamosis record
    await prisma.ownershipRegistry.update({
      where: { id: currentTeamosis.id },
      data: { effectiveTo: new Date(fromDate.getTime() - 86400000) }, // day before
    });

    // Create new partner record
    const newPartner = await prisma.ownershipRegistry.create({
      data: {
        entityId,
        ownerName,
        ownershipPct: new Decimal(pct),
        effectiveFrom: fromDate,
        notes,
      },
    });

    // Create new Teamosis record with reduced percentage
    const newTeamosisShare = 100 - pct;
    await prisma.ownershipRegistry.create({
      data: {
        entityId,
        ownerName: "Teamosis",
        ownershipPct: new Decimal(newTeamosisShare),
        effectiveFrom: fromDate,
      },
    });

    return NextResponse.json(
      { success: true, data: newPartner },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating partnership:", error);
    return NextResponse.json(
      { error: "Failed to create partnership" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { id, effectiveTo } = body;

  if (!id || !effectiveTo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const record = await prisma.ownershipRegistry.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const exitDate = new Date(effectiveTo);

    // Close the partner record
    const updated = await prisma.ownershipRegistry.update({
      where: { id },
      data: { effectiveTo: exitDate },
    });

    // Get current Teamosis record (should be active during partner's tenure)
    const currentTeamosis = await prisma.ownershipRegistry.findFirst({
      where: {
        entityId: record.entityId,
        ownerName: "Teamosis",
        effectiveTo: null,
      },
    });

    if (currentTeamosis) {
      // Close current Teamosis record
      await prisma.ownershipRegistry.update({
        where: { id: currentTeamosis.id },
        data: { effectiveTo: exitDate },
      });

      // Create new Teamosis record at 100% from day after partner exit
      const nextDay = new Date(exitDate.getTime() + 86400000);
      await prisma.ownershipRegistry.create({
        data: {
          entityId: record.entityId,
          ownerName: "Teamosis",
          ownershipPct: new Decimal(100),
          effectiveFrom: nextDay,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating partnership:", error);
    return NextResponse.json(
      { error: "Failed to update partnership" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const record = await prisma.ownershipRegistry.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Only allow deletion of future-dated records
    if (record.effectiveFrom <= new Date()) {
      return NextResponse.json(
        { error: "Can only delete future-dated records. Use PATCH to set effectiveTo instead." },
        { status: 400 }
      );
    }

    await prisma.ownershipRegistry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting record:", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
