import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, slug, type, color, parentId } = await req.json();
    if (!name || !slug) return NextResponse.json({ error: "Name and slug required" }, { status: 400 });

    const entity = await prisma.entity.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        type: type || "SUB_BRAND",
        color: color || "#3B82F6",
        parentId: parentId || null,
      },
    });

    // Auto-create default petty cash account
    await prisma.bankAccount.create({
      data: {
        entityId: entity.id,
        accountName: `${name} - Petty Cash`,
        accountType: "PETTY_CASH",
        currency: "BDT",
        isActive: true,
      },
    });

    // Auto-create default Teamosis 100% ownership record
    await prisma.ownershipRegistry.create({
      data: {
        entityId: entity.id,
        ownerName: "Teamosis",
        ownershipPct: new Decimal(100),
        effectiveFrom: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { id: entity.id, name: entity.name, slug: entity.slug } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, name, slug, color, type } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const entity = await prisma.entity.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug: slug.toLowerCase().replace(/\s+/g, "-") } : {}),
        ...(color ? { color } : {}),
        ...(type ? { type } : {}),
      },
    });
    return NextResponse.json({ success: true, data: { id: entity.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entities = await prisma.entity.findMany({
    orderBy: { type: "asc" },
    include: {
      ratioVersions: { where: { isCurrent: true }, take: 1 },
      _count: { select: { journalEntries: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: entities.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      type: e.type,
      color: e.color,
      parentId: e.parentId,
      isActive: e.isActive,
      transactionCount: e._count.journalEntries,
      currentRatios: e.ratioVersions[0] ? {
        quarter: e.ratioVersions[0].quarter,
        profitPct: Number(e.ratioVersions[0].profitPct),
        ownerCompPct: Number(e.ratioVersions[0].ownerCompPct),
        taxPct: Number(e.ratioVersions[0].taxPct),
        opexPct: Number(e.ratioVersions[0].opexPct),
      } : null,
    })),
  });
}
