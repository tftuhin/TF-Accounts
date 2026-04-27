export const revalidate = 300;

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetsClient } from "./assets-client";

export default async function AssetsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="card p-10 text-center text-ink-faint">
        Authentication required.
      </div>
    );
  }

  let entities: any[] = [];
  let assets: any[] = [];

  try {
    const [entitiesData, assetsData] = await Promise.all([
      prisma.entity.findMany({
        orderBy: { type: "asc" },
        select: { id: true, name: true, color: true, slug: true },
      }),
      prisma.fixedAsset.findMany({
        include: {
          entity: { select: { name: true, color: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    entities = entitiesData;
    assets = assetsData;
  } catch (error) {
    console.error("Error loading assets:", error);
    // Get entities even if assets table doesn't exist yet
    try {
      entities = await prisma.entity.findMany({
        orderBy: { type: "asc" },
        select: { id: true, name: true, color: true, slug: true },
      });
    } catch (err) {
      console.error("Error loading entities:", err);
    }
  }

  const serializedAssets = assets.map((asset) => ({
    id: asset.id,
    entityId: asset.entityId,
    entityName: asset.entity.name,
    entityColor: asset.entity.color,
    name: asset.name,
    description: asset.description,
    category: asset.category,
    purchaseDate: asset.purchaseDate.toISOString().split("T")[0],
    purchaseCost: Number(asset.purchaseCost),
    currency: asset.currency,
    usefulLifeYears: asset.usefulLifeYears,
    salvageValue: Number(asset.salvageValue),
    status: asset.status,
    disposalDate: asset.disposalDate ? asset.disposalDate.toISOString().split("T")[0] : null,
    disposalValue: asset.disposalValue ? Number(asset.disposalValue) : null,
  }));

  return <AssetsClient entities={entities} initialAssets={serializedAssets} isAdmin={session.role === "ADMIN"} />;
}
