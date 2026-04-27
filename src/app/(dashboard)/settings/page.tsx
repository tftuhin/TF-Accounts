export const revalidate = 300;

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase-server";
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

  const [entityRows, bankAccountRows] = await Promise.all([
    prisma.entity.findMany({
      orderBy: { type: "asc" },
      select: { id: true, slug: true, name: true, type: true, color: true },
    }),
    prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: [{ entityId: "asc" }, { accountType: "asc" }],
      include: { entity: { select: { name: true, color: true } } },
    }),
  ]);

  // Fetch ownership records for each entity
  const ownershipByEntity: Record<string, any[]> = {};
  try {
    for (const entity of entityRows) {
      const ownership = await prisma.ownershipRegistry.findMany({
        where: { entityId: entity.id },
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
      ownershipByEntity[entity.id] = ownership.map((o) => ({
        ...o,
        ownershipPct: Number(o.ownershipPct),
      }));
    }
  } catch (error) {
    console.error("Error fetching ownership records:", error);
    // If ownership fetch fails, continue with empty ownership for all entities
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

  let teamMembers: { id: string; email: string; fullName: string; role: string; isActive: boolean }[] = [];
  if (supabaseServer) {
    const { data: profiles } = await supabaseServer
      .from("profiles")
      .select("id, email, full_name, role, is_active")
      .order("created_at", { ascending: false });
    teamMembers = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      role: p.role,
      isActive: p.is_active,
    }));
  }

  return <SettingsClient entities={entities} bankAccounts={bankAccounts} teamMembers={teamMembers} />;
}
