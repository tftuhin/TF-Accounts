import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { TxnType } from "@prisma/client";
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
        createdByRole: session.role,
        lines: {
          create: [
            // Debit Fixed Assets account
            {
              accountId: accounts.fixedAssets.id,
              entryType: TxnType.DEBIT,
              amount: purchaseCost,
              currency,
              entityId: validated.entityId,
              memo: `Purchase: ${validated.name}`,
            },
            // Credit Bank account
            {
              accountId: accounts.cash.id,
              entryType: TxnType.CREDIT,
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
      select: {
        entityId: true, name: true, purchaseCost: true, currency: true,
        purchaseDate: true, salvageValue: true, usefulLifeYears: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const disposalDate = new Date(validated.disposalDate);
    const disposalValue = new Decimal(validated.disposalValue.toString());
    const purchaseCost = asset.purchaseCost;

    // Calculate accumulated depreciation and book value at the disposal date
    const depAtDisposal = calcDepreciation(
      Number(purchaseCost),
      Number(asset.salvageValue),
      asset.usefulLifeYears,
      asset.purchaseDate,
      disposalDate,
    );
    const accumulatedDep = new Decimal(depAtDisposal.accumulated.toFixed(2));
    const bookValue = new Decimal(depAtDisposal.bookValue.toFixed(2));
    // Gain/loss vs book value, not purchase cost
    const gain = disposalValue.minus(bookValue);

    // Get accounts
    const accounts = await ensureBasicAccounts(asset.entityId);

    // If a specific bank account was selected, get its details for the memo
    let bankAccountName = "Cash";
    if (validated.cashAccountId) {
      const selectedBankAccount = await prisma.bankAccount.findUnique({
        where: { id: validated.cashAccountId },
        select: { accountName: true },
      });
      if (selectedBankAccount) {
        bankAccountName = selectedBankAccount.accountName;
      }
    }

    // Always use the standard Cash account from ChartOfAccounts for the journal entry
    const cashAccount = accounts.cash;

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
        createdByRole: session.role,
        lines: {
          create: [
            // Dr Cash — proceeds received
            {
              accountId: cashAccount.id,
              entryType: TxnType.DEBIT,
              amount: disposalValue,
              currency: asset.currency,
              entityId: asset.entityId,
              memo: `Proceeds from sale (${bankAccountName}): ${asset.name}`,
            },
            // Dr Accumulated Depreciation — clear the contra-asset balance
            ...(!accumulatedDep.isZero()
              ? [{
                  accountId: accounts.accumulatedDepreciation.id,
                  entryType: TxnType.DEBIT as TxnType,
                  amount: accumulatedDep,
                  currency: asset.currency,
                  entityId: asset.entityId,
                  memo: `Clear accumulated depreciation: ${asset.name}`,
                }]
              : []),
            // Cr Fixed Assets — remove at original purchase cost
            {
              accountId: accounts.fixedAssets.id,
              entryType: TxnType.CREDIT,
              amount: purchaseCost,
              currency: asset.currency,
              entityId: asset.entityId,
              memo: `Disposal of: ${asset.name}`,
            },
            // Cr Gain or Dr Loss — based on proceeds vs book value
            ...(!gain.isZero()
              ? [{
                  accountId: gain.isPositive() ? accounts.gainOnDisposal.id : accounts.lossOnDisposal.id,
                  entryType: (gain.isPositive() ? TxnType.CREDIT : TxnType.DEBIT) as TxnType,
                  amount: gain.abs(),
                  currency: asset.currency,
                  entityId: asset.entityId,
                  memo: gain.isPositive()
                    ? `Gain on disposal: ${asset.name}`
                    : `Loss on disposal: ${asset.name}`,
                }]
              : []),
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

    // If proceeds go to petty cash, record it as a petty cash entry
    if (validated.cashAccountId) {
      const selectedAccount = await prisma.bankAccount.findUnique({
        where: { id: validated.cashAccountId },
        select: { accountType: true },
      });

      if (selectedAccount?.accountType === "PETTY_CASH") {
        // Get or create petty cash period for the disposal date
        const periodStart = new Date(disposalDate.getFullYear(), disposalDate.getMonth(), 1);
        const periodEnd = new Date(disposalDate.getFullYear(), disposalDate.getMonth() + 1, 0);

        let period = await prisma.pettyCashPeriod.findFirst({
          where: {
            entityId: asset.entityId,
            periodStart,
            periodEnd,
          },
        });

        if (!period) {
          period = await prisma.pettyCashPeriod.create({
            data: {
              entityId: asset.entityId,
              periodStart,
              periodEnd,
            },
          });
        }

        // Record the disposal proceeds as a float topup in petty cash
        await prisma.pettyCashEntry.create({
          data: {
            periodId: period.id,
            entityId: asset.entityId,
            date: disposalDate,
            description: `Asset disposal proceeds: ${asset.name}`,
            amount: disposalValue,
            currency: asset.currency,
            txnType: "FLOAT_TOPUP",
            journalEntryId: journalEntry.id,
            createdById: session.id,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAsset.id,
        status: updatedAsset.status,
        disposalValue: Number(disposalValue),
        bookValueAtDisposal: Number(bookValue),
        accumulatedDepreciation: Number(accumulatedDep),
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
