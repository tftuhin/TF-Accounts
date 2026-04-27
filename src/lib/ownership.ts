import { prisma } from "./prisma";

export interface OwnershipRecord {
  id: string;
  entityId: string;
  ownerName: string;
  ownershipPct: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  notes: string | null;
  isActive: boolean;
}

export async function getOwnershipAtDate(
  entityId: string,
  date: Date
): Promise<OwnershipRecord[]> {
  const records = await prisma.ownershipRegistry.findMany({
    where: {
      entityId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
  });

  const converted = records.map((r) => ({
    ...r,
    ownershipPct: Number(r.ownershipPct),
    isActive: r.effectiveTo === null,
  }));

  return converted;
}

export async function getTotalActiveOwnership(
  entityId: string,
  date: Date = new Date()
): Promise<number> {
  const records = await getOwnershipAtDate(entityId, date);
  return records.reduce((sum, r) => sum + r.ownershipPct, 0);
}

export async function getActiveTeamosisRecord(entityId: string) {
  return prisma.ownershipRegistry.findFirst({
    where: { entityId, ownerName: "Teamosis", effectiveTo: null },
  });
}

export async function createDefaultTeamosisOwnership(
  entityId: string,
  fromDate: Date
) {
  return prisma.ownershipRegistry.create({
    data: {
      entityId,
      ownerName: "Teamosis",
      ownershipPct: new Decimal(100),
      effectiveFrom: fromDate,
      effectiveTo: null,
    },
  });
}

import { Decimal } from "@prisma/client/runtime/library";
