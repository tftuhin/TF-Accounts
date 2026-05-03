import { getSession } from "@/lib/auth";
import { getActiveEntities, getActiveBankAccounts, getAllOwnership, getTeamMembers } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return (
      <div className="card p-10 text-center text-ink-faint">
        Admin access required.
      </div>
    );
  }

  const [entityRows, bankAccountRows, allOwnershipRows, teamMembers, pettyCashPeriodsRows] = await Promise.all([
    getActiveEntities(),
    getActiveBankAccounts(),
    getAllOwnership(),
    getTeamMembers(),
    prisma.pettyCashPeriod.findMany({
      orderBy: { periodStart: "desc" },
      include: { entity: { select: { name: true } } },
    }),
  ]);

  // Group ownership records by entityId (replaces previous N+1 loop)
  const ownershipByEntity: Record<string, any[]> = {};
  for (const o of allOwnershipRows) {
    if (!ownershipByEntity[o.entityId]) ownershipByEntity[o.entityId] = [];
    ownershipByEntity[o.entityId].push({
      id: o.id,
      ownerName: o.ownerName,
      ownershipPct: o.ownershipPct,
      effectiveFrom: o.effectiveFrom,
      effectiveTo: o.effectiveTo,
      notes: o.notes,
    });
  }

  const entities = entityRows.map((e) => ({
    ...e,
    ownership: ownershipByEntity[e.id] || [],
  }));

  const bankAccounts = bankAccountRows.map((a) => ({
    id: a.id,
    entityId: a.entityId,
    entityName: a.entity.name,
    entityColor: a.entity.color,
    accountName: a.accountName,
    accountType: a.accountType,
    currency: a.currency,
    bankName: a.bankName,
  }));

  const pettyCashPeriods = pettyCashPeriodsRows.map((p) => ({
    id: p.id,
    entityId: p.entityId,
    entityName: p.entity.name,
    periodStart: p.periodStart.toISOString().split("T")[0],
    periodEnd: p.periodEnd.toISOString().split("T")[0],
    isClosed: p.isClosed,
  }));

  return <SettingsClient entities={entities} bankAccounts={bankAccounts} teamMembers={teamMembers} pettyCashPeriods={pettyCashPeriods} />;
}
