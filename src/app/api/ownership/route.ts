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
    select: {
      id: true,
      ownerName: true,
      ownershipPct: true,
      effectiveFrom: true,
      effectiveTo: true,
      notes: true,
    },
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
  if (pct < 1 || pct > 100) {
    return NextResponse.json(
      { error: "Ownership must be 1-100%" },
      { status: 400 }
    );
  }

  const fromDate = new Date(effectiveFrom);

  try {
    // Get current active owners for this entity
    const activeOwners = await prisma.ownershipRegistry.findMany({
      where: {
        entityId,
        effectiveTo: null,
      },
    });

    // Calculate total ownership if we add this new owner
    const currentTotal = activeOwners.reduce((sum, o) => sum + Number(o.ownershipPct), 0);
    const newTotal = currentTotal + pct;

    // Validate that total ownership doesn't exceed 100%
    if (newTotal > 100) {
      return NextResponse.json(
        {
          error: `Total ownership would be ${newTotal}%. Current owners total ${currentTotal}%, new owner ${pct}% would exceed 100%.`
        },
        { status: 400 }
      );
    }

    // Simply create the new owner record
    const newOwner = await prisma.ownershipRegistry.create({
      data: {
        entityId,
        ownerName,
        ownershipPct: new Decimal(pct),
        effectiveFrom: fromDate,
        notes,
      },
    });

    // Return the created owner and current ownership summary
    const allOwners = await prisma.ownershipRegistry.findMany({
      where: {
        entityId,
        effectiveTo: null,
      },
      select: {
        id: true,
        ownerName: true,
        ownershipPct: true,
        effectiveFrom: true,
        effectiveTo: true,
        notes: true,
      },
    });

    const totalOwnership = allOwners.reduce((sum, o) => sum + Number(o.ownershipPct), 0);

    return NextResponse.json(
      {
        success: true,
        data: newOwner,
        summary: {
          owners: allOwners.map(o => ({
            ownerName: o.ownerName,
            ownershipPct: Number(o.ownershipPct),
          })),
          totalOwnership,
          isComplete: totalOwnership === 100,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ownership record:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ownership record" },
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
