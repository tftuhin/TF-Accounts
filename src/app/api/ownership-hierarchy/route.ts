import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOwnershipHierarchy } from "@/lib/ownership-setup";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");

  if (!entityId) {
    return NextResponse.json({ error: "entityId required" }, { status: 400 });
  }

  try {
    const hierarchy = await getOwnershipHierarchy(entityId);

    return NextResponse.json({
      success: true,
      data: {
        entityId,
        owners: hierarchy.map((owner) => ({
          name: owner.ownerName,
          directOwnershipPct: owner.ownershipPct,
          ultimateOwnershipPct: owner.ownershipPct, // At root level, these are same
          ownerEntityId: owner.ownerEntityId,
          ownerEntityName: owner.ownerEntityName,
          isEntity: owner.isEntity,
          effectiveFrom: owner.effectiveFrom.toISOString().split("T")[0],
          effectiveTo: owner.effectiveTo ? owner.effectiveTo.toISOString().split("T")[0] : null,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
