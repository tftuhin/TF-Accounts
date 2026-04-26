import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DrawingsClient } from "./drawings-client";

export default async function DrawingsPage() {
  const session = await getSession();
  if (!session) return null;

  const drawings = await prisma.drawing.findMany({
    take: 30,
    orderBy: { date: "desc" },
    include: {
      entity: { select: { name: true, color: true } },
      ownershipRegistry: { select: { ownerName: true, ownershipPct: true } },
      creator: { select: { fullName: true } },
    },
  });

  const owners = await prisma.ownershipRegistry.findMany({
    where: { effectiveTo: null },
    include: { entity: { select: { name: true, id: true } } },
  });

  return (
    <DrawingsClient
      drawings={drawings.map((d) => ({
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
      }))}
      owners={owners.map((o) => ({
        id: o.id,
        ownerName: o.ownerName,
        ownershipPct: Number(o.ownershipPct),
        entityId: o.entityId,
        entityName: o.entity.name,
      }))}
    />
  );
}
