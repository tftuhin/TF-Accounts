import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) return null;

  const entities = await prisma.entity.findMany({
    orderBy: { type: "asc" },
    select: { id: true, slug: true, name: true, type: true, color: true },
  });

  const ratioHistory = await prisma.pfRatioVersion.findMany({
    orderBy: [{ entityId: "asc" }, { effectiveFrom: "desc" }],
    include: { entity: { select: { name: true } } },
  });

  const owners = await prisma.ownershipRegistry.findMany({
    where: { effectiveTo: null },
    include: { entity: { select: { name: true, color: true } } },
  });

  return (
    <ReportsClient
      entities={entities}
      ratioHistory={ratioHistory.map((r) => ({
        id: r.id,
        entityName: r.entity.name,
        quarter: r.quarter,
        profitPct: Number(r.profitPct),
        ownerCompPct: Number(r.ownerCompPct),
        taxPct: Number(r.taxPct),
        opexPct: Number(r.opexPct),
        isCurrent: r.isCurrent,
      }))}
      owners={owners.map((o) => ({
        id: o.id,
        ownerName: o.ownerName,
        ownershipPct: Number(o.ownershipPct),
        entityName: o.entity.name,
        entityColor: o.entity.color,
        effectiveFrom: o.effectiveFrom.toISOString().split("T")[0],
      }))}
    />
  );
}
