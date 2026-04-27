import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { TxnType } from "@prisma/client";
import { calcDepreciation } from "@/lib/asset-depreciation";
import { ensureBasicAccounts } from "@/lib/accounts";

export async function POST(req: NextRequest) {
  // Check for either admin session or Vercel cron job
  const session = await getSession();
  const isCronJob = req.headers.get("x-vercel-cron");

  const isAdmin = session && session.role === "ADMIN";

  if (!isAdmin && !isCronJob) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // For cron jobs, createdById is null; for admin users, use their ID
  const userId = session?.id || null;
  const userRole = session?.role || "ADMIN";

  try {
    let entityId, month, year;

    // Handle both direct API calls and cron job calls (which may not have body)
    try {
      const body = await req.json();
      entityId = body.entityId;
      month = body.month;
      year = body.year;
    } catch {
      // No body provided (cron job), use defaults
    }

    // Default to current month if not provided
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Find all ACTIVE fixed assets
    const assets = await prisma.fixedAsset.findMany({
      where: {
        status: "ACTIVE",
        ...(entityId && { entityId }),
      },
      include: { entity: { select: { id: true, name: true } } },
    });

    if (assets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active assets found",
        entriesCreated: 0,
      });
    }

    const results = [];

    // Process each entity's depreciation
    const entitiesByAssets = new Map<
      string,
      (typeof assets)[0][]
    >();

    assets.forEach((asset) => {
      if (!entitiesByAssets.has(asset.entityId)) {
        entitiesByAssets.set(asset.entityId, []);
      }
      entitiesByAssets.get(asset.entityId)!.push(asset);
    });

    for (const [entityId, entityAssets] of entitiesByAssets) {
      // Ensure basic accounts exist
      const accounts = await ensureBasicAccounts(entityId);

      // Ensure depreciation expense account exists
      let depreciationExpenseAccount = await prisma.chartOfAccounts.findFirst({
        where: {
          entityId,
          accountCode: "5100",
        },
      });

      if (!depreciationExpenseAccount) {
        depreciationExpenseAccount = await prisma.chartOfAccounts.create({
          data: {
            entityId,
            accountCode: "5100",
            accountName: "Depreciation Expense",
            accountGroup: "expense",
            isActive: true,
          },
        });
      }

      // Calculate total depreciation for the month
      let totalMonthlyDep = new Decimal(0);
      const depreciationDetails: Array<{
        assetId: string;
        assetName: string;
        monthlyDep: number;
      }> = [];

      for (const asset of entityAssets) {
        const depreciation = calcDepreciation(
          Number(asset.purchaseCost),
          Number(asset.salvageValue),
          asset.usefulLifeYears,
          asset.purchaseDate
        );

        const monthlyDep = new Decimal(depreciation.monthlyDep.toString());
        totalMonthlyDep = totalMonthlyDep.plus(monthlyDep);

        depreciationDetails.push({
          assetId: asset.id,
          assetName: asset.name,
          monthlyDep: depreciation.monthlyDep,
        });
      }

      // Only create entry if there's depreciation to record
      if (totalMonthlyDep.isZero()) {
        results.push({
          entityId,
          entityName: entityAssets[0].entity.name,
          message: "No depreciation to accrue",
          assetsProcessed: entityAssets.length,
        });
        continue;
      }

      // Create journal entry for the depreciation
      const entryDate = new Date(
        targetYear,
        targetMonth - 1,
        new Date(targetYear, targetMonth, 0).getDate()
      );

      const journalEntry = await prisma.journalEntry.create({
        data: {
          entityId,
          date: entryDate,
          description: `Monthly Depreciation Accrual - ${new Intl.DateTimeFormat(
            "en-US",
            { month: "long", year: "numeric" }
          ).format(entryDate)}`,
          status: "FINALIZED",
          category: "Depreciation",
          createdById: userId,
          createdByRole: userRole as any,
          lines: {
            create: [
              // Debit Depreciation Expense
              {
                accountId: depreciationExpenseAccount.id,
                entryType: TxnType.DEBIT,
                amount: totalMonthlyDep,
                currency: "BDT",
                entityId,
                memo: `Depreciation accrual for ${entityAssets.length} asset(s)`,
              },
              // Credit Fixed Assets account
              {
                accountId: accounts.fixedAssets.id,
                entryType: TxnType.CREDIT,
                amount: totalMonthlyDep,
                currency: "BDT",
                entityId,
                memo: "Accumulated depreciation",
              },
            ],
          },
        },
      });

      results.push({
        entityId,
        entityName: entityAssets[0].entity.name,
        journalEntryId: journalEntry.id,
        assetsProcessed: entityAssets.length,
        totalDepreciation: Number(totalMonthlyDep),
        details: depreciationDetails,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Depreciation accrued for ${results.length} entit${
        results.length === 1 ? "y" : "ies"
      }`,
      results,
      entriesCreated: results.filter((r) => r.journalEntryId).length,
    });
  } catch (err: unknown) {
    console.error("Depreciation accrual error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");

    // Check if depreciation has already been accrued for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const existingEntry = await prisma.journalEntry.findFirst({
      where: {
        category: "Depreciation",
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        ...(entityId && { entityId }),
      },
    });

    return NextResponse.json({
      success: true,
      hasDepreciationForMonth: !!existingEntry,
      currentMonth: `${monthStart.getMonth() + 1}/${monthStart.getFullYear()}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
