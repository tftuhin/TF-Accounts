import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { getDrawingsList, getActiveOwners, getActiveEntities, getPfBalances } from "@/lib/queries";
import { DrawingsClient } from "./drawings-client";

export default async function DrawingsPage() {
  const session = await getSession();
  if (!session || !canAccess(session.role, "drawings")) {
    return <div className="card p-10 text-center text-ink-faint">Access denied.</div>;
  }

  let drawings: Awaited<ReturnType<typeof getDrawingsList>> = [];
  let owners: Awaited<ReturnType<typeof getActiveOwners>> = [];
  let entities: Awaited<ReturnType<typeof getActiveEntities>> = [];
  let pfLines: Awaited<ReturnType<typeof getPfBalances>> = [];

  try {
    [drawings, owners, entities, pfLines] = await Promise.all([
      getDrawingsList().catch(() => []),
      getActiveOwners().catch(() => []),
      getActiveEntities().catch(() => []),
      getPfBalances().catch(() => []),
    ]);
  } catch (error) {
    console.error("Error loading drawings page data:", error);
    return <div className="card p-10 text-center text-ink-faint">Error loading drawings. Please try again.</div>;
  }

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
        date: d.date.split("T")[0],
        entityName: d.entity.name,
        entityColor: d.entity.color,
        entityId: d.entityId,
        ownerName: d.ownershipRegistry?.ownerName || "Unknown Owner",
        ownershipPct: d.ownershipRegistry?.ownershipPct ?? 0,
        sourceAccount: d.sourceAccount,
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        balanceAtDraw: d.accountBalanceAtDraw,
        note: d.note,
      }))}
      owners={owners.map((o) => ({
        id: o.id,
        ownerName: o.ownerName,
        ownershipPct: o.ownershipPct,
        entityId: o.entityId,
        entityName: o.entity?.name || "Unknown",
      }))}
      entities={entities}
      pfBalances={pfBalances}
      consolidatedBalances={consolidated}
    />
  );
}
