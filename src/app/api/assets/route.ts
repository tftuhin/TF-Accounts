import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { TxnStatus } from "@prisma/client";
import { z } from "zod";
import { calcDepreciation } from "@/lib/asset-depreciation";

const createAssetSchema = z.object({
  entityId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["COMPUTER_ELECTRONICS", "FURNITURE_FIXTURES", "VEHICLES", "SOFTWARE_LICENSES", "OFFICE_EQUIPMENT", "LAND_BUILDING", "OTHER"]),
  purchaseDate: z.string().datetime(),
  purchaseCost: z.number().positive(),
  currency: z.enum(["BDT", "USD"]).optional(),
  usefulLifeYears: z.number().int().min(1).max(50),
  salvageValue: z.number().min(0).optional(),
});

const disposalSchema = z.object({
  id: z.string().uuid(),
  disposalDate: z.string().datetime(),
  disposalValue: z.number().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");

  try {
    const where = entityId ? { entityId } : {};
    const assets = await prisma.fixedAsset.findMany({
      where,
      include: {
        entity: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedAssets = assets.map((asset) => {
      const now = new Date();
      const depreciation = calcDepreciation(
        Number(asset.purchaseCost),
        Number(asset.salvageValue),
        asset.usefulLifeYears,
        asset.purchaseDate,
        asset.status === "DISPOSED" && asset.disposalDate ? asset.disposalDate : now
      );

      return {
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
        ...depreciation,
      };
    });

    return NextResponse.json({ success: true, data: enrichedAssets });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const validated = createAssetSchema.parse(body);

    // Verify entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: validated.entityId },
      select: { id: true, name: true, color: true },
    });

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    const currency = validated.currency || "BDT";
    const purchaseCost = new Decimal(validated.purchaseCost.toString());
    const purchaseDate = new Date(validated.purchaseDate);

    // Find or get asset and bank accounts for the chart of accounts
    const assetAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        entityId: validated.entityId,
        accountGroup: "asset",
        accountName: { contains: "Fixed Asset" },
      },
    });

    const bankAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        entityId: validated.entityId,
        accountGroup: "asset",
        accountName: { contains: currency === "USD" ? "USD" : "BDT" },
      },
    });

    // Create the fixed asset record
    const asset = await prisma.fixedAsset.create({
      data: {
        entityId: validated.entityId,
        name: validated.name,
        description: validated.description || null,
        category: validated.category,
        purchaseDate,
        purchaseCost,
        currency,
        usefulLifeYears: validated.usefulLifeYears,
        salvageValue: new Decimal((validated.salvageValue || 0).toString()),
        createdById: session.id,
        journalEntry: assetAccount && bankAccount ? {
          create: {
            entityId: validated.entityId,
            description: `Fixed Asset Purchase: ${validated.name}`,
            date: purchaseDate,
            status: TxnStatus.FINALIZED,
            createdById: session.id,
            createdByRole: session.role as any,
            lines: {
              create: [
                {
                  entityId: validated.entityId,
                  accountId: assetAccount.id,
                  entryType: "DEBIT",
                  amount: purchaseCost,
                  currency,
                  memo: `Purchase of ${validated.name}`,
                },
                {
                  entityId: validated.entityId,
                  accountId: bankAccount.id,
                  entryType: "CREDIT",
                  amount: purchaseCost,
                  currency,
                  memo: `Payment for ${validated.name}`,
                },
              ],
            },
          },
        } : undefined,
      },
    });

    const depreciation = calcDepreciation(
      Number(asset.purchaseCost),
      Number(asset.salvageValue),
      asset.usefulLifeYears,
      asset.purchaseDate
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: asset.id,
          entityId: asset.entityId,
          entityName: entity.name,
          name: asset.name,
          category: asset.category,
          purchaseDate: asset.purchaseDate.toISOString().split("T")[0],
          purchaseCost: Number(asset.purchaseCost),
          currency: asset.currency,
          usefulLifeYears: asset.usefulLifeYears,
          salvageValue: Number(asset.salvageValue),
          status: asset.status,
          ...depreciation,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Asset creation error:", err);
    if (err instanceof z.ZodError) {
      const fieldErrors = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return NextResponse.json({ error: `Validation error: ${fieldErrors}` }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const validated = disposalSchema.parse(body);

    const asset = await prisma.fixedAsset.findUnique({
      where: { id: validated.id },
      select: { entityId: true, name: true, purchaseCost: true, currency: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const disposalDate = new Date(validated.disposalDate);
    const disposalValue = validated.disposalValue ? new Decimal(validated.disposalValue.toString()) : asset.purchaseCost;
    const gain = disposalValue.minus(asset.purchaseCost);

    // Find accounts for disposal journal entry
    const assetAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        entityId: asset.entityId,
        accountGroup: "asset",
        accountName: { contains: "Fixed Asset" },
      },
    });

    const bankAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        entityId: asset.entityId,
        accountGroup: "asset",
        accountName: { contains: asset.currency === "USD" ? "USD" : "BDT" },
      },
    });

    // Create disposal journal entry if accounts exist
    if (assetAccount && bankAccount) {
      const gainLossAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          entityId: asset.entityId,
          accountName: { contains: "Gain" },
        },
      });

      await prisma.journalEntry.create({
        data: {
          entityId: asset.entityId,
          description: `Fixed Asset Disposal: ${asset.name}`,
          date: disposalDate,
          status: TxnStatus.FINALIZED,
          createdById: session.id,
          createdByRole: session.role as any,
          lines: {
            create: [
              // Credit the fixed asset account (remove from books)
              {
                entityId: asset.entityId,
                accountId: assetAccount.id,
                entryType: "CREDIT",
                amount: asset.purchaseCost,
                currency: asset.currency,
                memo: `Disposal of ${asset.name}`,
              },
              // Debit bank account for cash received
              {
                entityId: asset.entityId,
                accountId: bankAccount.id,
                entryType: "DEBIT",
                amount: disposalValue,
                currency: asset.currency,
                memo: `Proceeds from sale of ${asset.name}`,
              },
              // Gain/loss account if there's a difference
              ...(gainLossAccount && !gain.isZero()
                ? [
                    {
                      entityId: asset.entityId,
                      accountId: gainLossAccount.id,
                      entryType: gain.isPositive() ? "CREDIT" : "DEBIT",
                      amount: gain.abs(),
                      currency: asset.currency,
                      memo: `${gain.isPositive() ? "Gain" : "Loss"} on asset disposal`,
                    },
                  ]
                : []),
            ],
          },
        },
      });
    }

    // Update asset with disposal details
    const updatedAsset = await prisma.fixedAsset.update({
      where: { id: validated.id },
      data: {
        status: "DISPOSED",
        disposalDate,
        disposalValue,
      },
      include: { entity: { select: { name: true, color: true } } },
    });

    return NextResponse.json({ success: true, data: { id: updatedAsset.id, status: updatedAsset.status } });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
