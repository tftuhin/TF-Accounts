import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";
import { calcDepreciation } from "@/lib/asset-depreciation";
import { ensureBasicAccounts } from "@/lib/accounts";

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
  disposalValue: z.number().min(0),
  cashAccountId: z.string().uuid().optional(), // Which bank/cash account receives proceeds
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

    // Ensure basic accounts including Fixed Assets
    const accounts = await ensureBasicAccounts(validated.entityId);

    // Create journal entry for asset purchase
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entityId: validated.entityId,
        description: `Fixed Asset Purchase: ${validated.name}`,
        date: purchaseDate,
        status: "FINALIZED",
        category: `Asset › ${validated.category}`,
        createdById: session.id,
        createdByRole: session.role as any,
        lines: {
          create: [
            // Debit Fixed Assets account
            {
              accountId: accounts.fixedAssets.id,
              entryType: "DEBIT",
              amount: purchaseCost,
              currency,
              entityId: validated.entityId,
              memo: `Purchase: ${validated.name}`,
            },
            // Credit Bank account
            {
              accountId: accounts.cash.id,
              entryType: "CREDIT",
              amount: purchaseCost,
              currency,
              entityId: validated.entityId,
              memo: `Payment for: ${validated.name}`,
            },
          ],
        },
      },
    });

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
        journalEntryId: journalEntry.id,
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

    // Get asset details for journal entry
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: validated.id },
      select: { entityId: true, name: true, purchaseCost: true, currency: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const disposalDate = new Date(validated.disposalDate);
    const disposalValue = new Decimal(validated.disposalValue.toString());
    const purchaseCost = asset.purchaseCost;
    const gain = disposalValue.minus(purchaseCost);

    // Get accounts
    const accounts = await ensureBasicAccounts(asset.entityId);
    const cashAccount = validated.cashAccountId
      ? await prisma.chartOfAccounts.findUnique({ where: { id: validated.cashAccountId } })
      : accounts.cash;

    if (!cashAccount) {
      return NextResponse.json({ error: "Cash account not found" }, { status: 404 });
    }

    // Create disposal journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entityId: asset.entityId,
        description: `Fixed Asset Disposal: ${asset.name}`,
        date: disposalDate,
        status: "FINALIZED",
        category: "Asset Disposal",
        createdById: session.id,
        createdByRole: session.role as any,
        lines: {
          create: [
            // Debit Cash account (proceeds received)
            {
              accountId: cashAccount.id,
              entryType: "DEBIT",
              amount: disposalValue,
              currency: asset.currency,
              entityId: asset.entityId,
              memo: `Proceeds from sale: ${asset.name}`,
            },
            // Credit Fixed Assets account (remove from books)
            {
              accountId: accounts.fixedAssets.id,
              entryType: "CREDIT",
              amount: purchaseCost,
              currency: asset.currency,
              entityId: asset.entityId,
              memo: `Disposal of: ${asset.name}`,
            },
            // Gain or Loss if proceeds differ from cost
            ...(gain.isZero()
              ? []
              : [
                  {
                    accountId: accounts.income.id, // Use income for gains, could use separate account for losses
                    entryType: gain.isPositive() ? "CREDIT" : "DEBIT",
                    amount: gain.abs(),
                    currency: asset.currency,
                    entityId: asset.entityId,
                    memo: gain.isPositive()
                      ? `Gain on asset disposal: ${asset.name}`
                      : `Loss on asset disposal: ${asset.name}`,
                  },
                ]),
          ],
        },
      },
    });

    // Update asset
    const updatedAsset = await prisma.fixedAsset.update({
      where: { id: validated.id },
      data: {
        status: "DISPOSED",
        disposalDate,
        disposalValue,
      },
      include: { entity: { select: { name: true, color: true } } },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAsset.id,
        status: updatedAsset.status,
        disposalValue: Number(disposalValue),
        gain: Number(gain),
        journalEntryId: journalEntry.id,
      },
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
