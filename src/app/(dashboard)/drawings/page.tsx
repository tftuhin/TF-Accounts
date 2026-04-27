import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/rbac";
import { DrawingsClient } from "./drawings-client";

export default async function DrawingsPage() {
  const session = await getSession();
  if (!session || !canAccess(session.role, "drawings")) {
    return <div className="card p-10 text-center text-ink-faint">Access denied.</div>;
  }

  const [drawings, owners, entities, pfLines] = await Promise.all([
    prisma.drawing.findMany({
      take: 50,
      orderBy: { date: "desc" },
      include: {
        entity: { select: { name: true, color: true } },
        ownershipRegistry: { select: { ownerName: true, ownershipPct: true } },
      },
    }),
    prisma.ownershipRegistry.findMany({
      where: { effectiveTo: null },
      include: { entity: { select: { name: true, id: true } } },
    }).catch(() => []), // Fallback if query fails
    prisma.entity.findMany({
      where: { isActive: true },
      orderBy: { type: "asc" },
      select: { id: true, name: true, type: true, color: true },
    }),
    // Compute real PF balances (PROFIT + OWNERS_COMP) from journal entries
    prisma.journalEntryLine.findMany({
      where: {
        pfAccount: { in: ["PROFIT", "OWNERS_COMP"] },
        journalEntry: { status: "FINALIZED" },
      },
      select: { pfAccount: true, entryType: true, amount: true, entityId: true },
    }),
  ]);

  // Compute balances per entity per PF account
  const pfBalances: Record<string, Record<string, number>> = {};
  for (const line of pfLines) {
    if (!pfBalances[line.entityId]) pfBalances[line.entityId] = { PROFIT: 0, OWNERS_COMP: 0 };
    const amt = Number(line.amount);
    if (line.entryType === "CREDIT") pfBalances[line.entityId][line.pfAccount!] += amt;
    else pfBalances[line.entityId][line.pfAccount!] -= amt;
  }

  // Aggregate to consolidated
  const consolidated = { PROFIT: 0, OWNERS_COMP: 0 };
  for (const bal of Object.values(pfBalances)) {
    consolidated.PROFIT += bal.PROFIT || 0;
    consolidated.OWNERS_COMP += bal.OWNERS_COMP || 0;
  }

  return (
    <DrawingsClient
      drawings={drawings.map((d) => ({
        id: d.id,
        date: d.date.toISOString().split("T")[0],
        entityName: d.entity.name,
        entityColor: d.entity.color,
        entityId: d.entityId,
        ownerName: d.ownershipRegistry?.ownerName || "Unknown Owner",
        ownershipPct: d.ownershipRegistry ? Number(d.ownershipRegistry.ownershipPct) : 0,
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
        entityName: o.entity?.name || "Unknown",
      }))}
      entities={entities}
      pfBalances={pfBalances}
      consolidatedBalances={consolidated}
    />
  );
}
