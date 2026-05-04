import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TxnType } from "@prisma/client";

interface IncomeEntry {
  date: string;
  description: string;
  amount: number;
  currency: string;
  entity: string;
  entityId: string;
  selectedAccountId: string;
}

async function ensureRevenueAccount(entityId: string): Promise<string> {
  let revenueAccount = await prisma.chartOfAccounts.findFirst({
    where: { entityId, pfAccount: "INCOME" },
    select: { id: true },
  });

  if (!revenueAccount) {
    revenueAccount = await prisma.chartOfAccounts.create({
      data: {
        entityId,
        accountCode: "4000",
        accountName: "Sales Revenue",
        pfAccount: "INCOME",
        accountGroup: "revenue",
      },
      select: { id: true },
    });
  }

  return revenueAccount.id;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const entries: IncomeEntry[] = body.entries;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "No entries provided" }, { status: 400 });
    }

    console.log(`Starting manual income import for ${entries.length} entries`);

    const errors: Array<{ row: number; error: string }> = [];
    let created = 0;

    const importBatch = `import-income-manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate all entries first
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const rowNumber = i + 1;

      try {
        if (!entry.selectedAccountId) {
          errors.push({ row: rowNumber, error: "No account selected" });
          continue;
        }

        // Verify the account exists and belongs to the entity
        const account = await prisma.chartOfAccounts.findFirst({
          where: { id: entry.selectedAccountId, entityId: entry.entityId },
          select: { id: true },
        });

        if (!account) {
          errors.push({ row: rowNumber, error: "Selected account not found for this entity" });
          continue;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Validation error";
        console.error(`Row ${rowNumber} validation error:`, err);
        errors.push({ row: rowNumber, error: msg });
      }
    }

    if (errors.length === entries.length) {
      return NextResponse.json({
        success: false,
        data: {
          created: 0,
          importBatch,
          errors,
        },
      }, { status: 400 });
    }

    // Create journal entries in batches
    const batchSize = 30;
    const uniqueEntityIds = [...new Set(entries.map(e => e.entityId))];

    // Ensure revenue accounts exist for all entities
    const revenueAccountMap = new Map<string, string>();
    for (const entityId of uniqueEntityIds) {
      try {
        const revenueAccountId = await ensureRevenueAccount(entityId);
        revenueAccountMap.set(entityId, revenueAccountId);
      } catch (err) {
        console.error(`Failed to ensure revenue account for entity ${entityId}:`, err);
      }
    }

    // Create entries
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      const promises = batch.map(async (entry, batchIndex) => {
        const rowNumber = i + batchIndex + 1;

        try {
          if (!entry.selectedAccountId) {
            errors.push({ row: rowNumber, error: "No account selected" });
            return false;
          }

          const revenueAccountId = revenueAccountMap.get(entry.entityId);
          if (!revenueAccountId) {
            errors.push({ row: rowNumber, error: "Revenue account not found" });
            return false;
          }

          const date = new Date(entry.date);
          if (isNaN(date.getTime())) {
            errors.push({ row: rowNumber, error: "Invalid date" });
            return false;
          }

          // Validate and normalize currency
          const currency = (entry.currency || "BDT").toUpperCase();
          const validCurrencies = ["USD", "BDT"];
          const finalCurrency = validCurrencies.includes(currency) ? currency : "BDT";

          await prisma.journalEntry.create({
            data: {
              entityId: entry.entityId,
              date,
              description: entry.description,
              status: "FINALIZED",
              category: "Sales Revenue",
              createdById: null,
              createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER",
              importBatch,
              lines: {
                create: [
                  {
                    accountId: entry.selectedAccountId,
                    entryType: TxnType.DEBIT,
                    amount: entry.amount,
                    currency: finalCurrency as "USD" | "BDT",
                    entityId: entry.entityId,
                  },
                  {
                    accountId: revenueAccountId,
                    pfAccount: "INCOME",
                    entryType: TxnType.CREDIT,
                    amount: entry.amount,
                    currency: finalCurrency as "USD" | "BDT",
                    entityId: entry.entityId,
                  },
                ],
              },
            },
          });

          return true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create entry";
          console.error(`Row ${rowNumber} creation error:`, err);
          errors.push({ row: rowNumber, error: msg });
          return false;
        }
      });

      const results = await Promise.all(promises);
      const batchSuccess = results.filter(r => r).length;
      created += batchSuccess;

      if (i % 100 === 0) {
        console.log(`Progress: ${Math.min(i + batch.length, entries.length)}/${entries.length}`);
      }
    }

    console.log(`Successfully created ${created}/${entries.length} income entries`);

    return NextResponse.json({
      success: true,
      data: {
        created,
        importBatch,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Manual income import error:", err);
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 }
    );
  }
}
