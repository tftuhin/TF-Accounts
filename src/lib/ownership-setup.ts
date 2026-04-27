import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Sets up default 100% Teamosis ownership for a new sub-brand
 * If the entity is a SUB_BRAND with a parentId (parent = Teamosis), this creates the ownership entry
 */
export async function setupDefaultOwnership(entityId: string) {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { type: true, parentId: true, name: true },
  });

  if (!entity || entity.type !== "SUB_BRAND" || !entity.parentId) {
    return null; // Only set up ownership for sub-brands with a parent
  }

  const parentEntity = await prisma.entity.findUnique({
    where: { id: entity.parentId },
    select: { name: true },
  });

  if (!parentEntity) {
    return null;
  }

  // Check if ownership already exists
  const existingOwnership = await prisma.ownershipRegistry.findFirst({
    where: {
      entityId,
      ownerEntityId: entity.parentId,
    },
  });

  if (existingOwnership) {
    return existingOwnership; // Already set up
  }

  // Create 100% ownership by parent entity
  return await prisma.ownershipRegistry.create({
    data: {
      entityId,
      ownerName: parentEntity.name,
      ownerEntityId: entity.parentId,
      ownershipPct: new Decimal(100),
      effectiveFrom: new Date(),
      notes: `Default 100% ownership by parent company ${parentEntity.name}`,
    },
  });
}

/**
 * Get the full ownership hierarchy for an entity
 * Returns: Direct owners + their owners (recursively)
 */
export async function getOwnershipHierarchy(entityId: string, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return [];

  const ownership = await prisma.ownershipRegistry.findMany({
    where: { entityId },
    include: {
      ownerEntity: { select: { id: true, name: true, type: true } },
    },
  });

  const result = ownership.map((o) => ({
    ownerName: o.ownerName,
    ownershipPct: Number(o.ownershipPct),
    ownerEntityId: o.ownerEntityId,
    ownerEntityName: o.ownerEntity?.name,
    effectiveFrom: o.effectiveFrom,
    effectiveTo: o.effectiveTo,
    isEntity: !!o.ownerEntity,
  }));

  // Recursively get parent entity's owners if this is owned by another entity
  for (const owner of ownership) {
    if (owner.ownerEntity) {
      const parentOwners = await getOwnershipHierarchy(owner.ownerEntityId!, depth + 1, maxDepth);
      result.push(
        ...parentOwners.map((p) => ({
          ...p,
          ownershipPct: (Number(owner.ownershipPct) * p.ownershipPct) / 100, // Calculate cascading ownership %
        }))
      );
    }
  }

  return result;
}
