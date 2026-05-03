import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TxnType } from "@prisma/client";

interface CSVRow {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
  Entity?: string;
}

const REQUIRED_COLUMNS = ["Date", "Description", "Amount", "Category"];

function detectDelimiter(lines: string[]): string {
  const delimiters = [",", ";", "\t", "|"];
  const headerLine = lines[0];

  // For each delimiter, check how consistent column counts are
  let bestDelimiter = ",";
  let bestScore = -1;

  for (const delim of delimiters) {
    const counts: number[] = [];
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      counts.push(lines[i].split(delim).length);
    }

    // Best delimiter should have consistent column count
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / counts.length;

    // Prefer delimiters with:
    // 1. More columns (4+ is ideal for our format)
    // 2. Consistent column count (low variance)
    const score = (avgCount >= 4 ? avgCount : 0) - variance;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

function parseValue(value: string): string {
  return value
    .trim()
    .replace(/^["'](.*)["']$/, "$1") // Remove surrounding quotes
    .trim();
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const headerLine = lines[0];
  const headers = headerLine.split(delimiter).map(parseValue);

  // Validate headers (case-insensitive)
  const headerLower = headers.map((h) => h.toLowerCase());
  const requiredLower = REQUIRED_COLUMNS.map((c) => c.toLowerCase());
  const missingColumns = requiredLower.filter((col) => !headerLower.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Found: ${headers.join(", ")}`
    );
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);

    if (values.length < headers.length) {
      // Pad with empty strings if not enough columns
      while (values.length < headers.length) {
        values.push("");
      }
    }

    const row: Partial<CSVRow> = {};

    headers.forEach((header, index) => {
      const normalizedHeader = REQUIRED_COLUMNS.concat("Entity").find(
        (col) => col.toLowerCase() === header.toLowerCase()
      ) as keyof CSVRow;
      if (normalizedHeader) {
        row[normalizedHeader] = values[index] || "";
      }
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const dataType = formData.get("dataType") as string;
    const source = formData.get("source") as string;
    const defaultEntityId = formData.get("defaultEntityId") as string;
    const bankAccountId = formData.get("bankAccountId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!dataType || !["income", "expense", "withdraw"].includes(dataType)) {
      return NextResponse.json({ error: "Invalid data type" }, { status: 400 });
    }

    if (!defaultEntityId) {
      return NextResponse.json({ error: "Default entity required" }, { status: 400 });
    }

    console.log(`Starting import: ${file.name}, size: ${file.size} bytes`);
    const content = await file.text();
    console.log(`CSV content read: ${content.length} chars, parsing...`);
    const rows = parseCSV(content);
    console.log(`Parsed ${rows.length} rows`);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; error: string }> = [];
    let created = 0;

    // Generate unique import batch ID for tracking
    const importBatch = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Import batch ID: ${importBatch}`);

    // Pre-load all entities and petty cash periods to avoid N+1 queries
    console.log("Pre-loading entities and petty cash periods...");
    const [allEntities, allPettyCashPeriods, bankAccount] = await Promise.all([
      prisma.entity.findMany({
        select: { id: true, name: true },
      }),
      source === "petty-cash"
        ? prisma.pettyCashPeriod.findMany({
            where: { isClosed: false },
            select: { id: true, entityId: true, periodStart: true, periodEnd: true },
          })
        : Promise.resolve([]),
      source === "bank" && bankAccountId
        ? prisma.bankAccount.findFirst({
            where: { id: bankAccountId },
            select: { id: true, entityId: true },
          })
        : Promise.resolve(null),
    ]);

    const entityMap = new Map(allEntities.map((e) => [e.name.toLowerCase(), e.id]));
    console.log(`Pre-loaded ${allEntities.length} entities, ${allPettyCashPeriods.length} petty cash periods`);

    // Prepare batch arrays
    const journalEntriesToCreate: any[] = [];
    const pettyCashEntriesToCreate: any[] = [];

    // First pass: validate and collect data
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because header is row 1

      if (i % 100 === 0) {
        console.log(`Validating row ${i}...`);
      }

      try {
        // Validate required fields (Entity is optional)
        if (!row.Date || !row.Description || !row.Amount || !row.Category) {
          errors.push({
            row: rowNumber,
            error: `Missing field: ${
              !row.Date
                ? "Date"
                : !row.Description
                  ? "Description"
                  : !row.Amount
                    ? "Amount"
                    : "Category"
            }`,
          });
          continue;
        }

        // Parse and validate date
        const date = new Date(row.Date);
        if (isNaN(date.getTime())) {
          errors.push({ row: rowNumber, error: "Invalid date format" });
          continue;
        }

        // Parse and validate amount - handle various formats
        let amountStr = row.Amount.toString().trim();

        // Remove currency symbols and common formatting
        amountStr = amountStr
          .replace(/[^\d.,\-]/g, "") // Remove all non-numeric chars except decimal/thousands separators
          .trim();

        // Handle both comma and dot as decimal separator
        // If there's both comma and dot, assume the last one is decimal separator
        if (amountStr.includes(",") && amountStr.includes(".")) {
          const lastCommaIndex = amountStr.lastIndexOf(",");
          const lastDotIndex = amountStr.lastIndexOf(".");

          if (lastDotIndex > lastCommaIndex) {
            // Dot is decimal, remove commas (1,250.00 format)
            amountStr = amountStr.replace(/,/g, "");
          } else {
            // Comma is decimal, remove dots (1.250,00 format)
            amountStr = amountStr.replace(/\./g, "").replace(",", ".");
          }
        } else if (amountStr.includes(",")) {
          // Only comma exists - could be decimal or thousands separator
          const commaCount = (amountStr.match(/,/g) || []).length;
          if (commaCount === 1) {
            // Single comma - assume it's decimal separator if 2 digits after it
            const afterComma = amountStr.split(",")[1];
            if (afterComma && afterComma.length <= 2) {
              amountStr = amountStr.replace(",", ".");
            } else {
              // Comma is thousands separator
              amountStr = amountStr.replace(/,/g, "");
            }
          } else {
            // Multiple commas - assume thousands separators
            amountStr = amountStr.replace(/,/g, "");
          }
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount === 0) {
          errors.push({ row: rowNumber, error: `Invalid amount: "${row.Amount}"` });
          continue;
        }

        // Determine entity: use provided Entity or default
        let entityId = defaultEntityId;

        if (row.Entity && row.Entity.trim()) {
          const foundEntityId = entityMap.get(row.Entity.trim().toLowerCase());
          if (!foundEntityId) {
            errors.push({
              row: rowNumber,
              error: `Entity "${row.Entity}" not found`,
            });
            continue;
          }
          entityId = foundEntityId;
        }

        if (source === "bank") {
          // Validate bank transaction
          if (!bankAccountId) {
            errors.push({ row: rowNumber, error: "Bank account not selected" });
            continue;
          }

          if (!bankAccount) {
            errors.push({
              row: rowNumber,
              error: "Bank account not found",
            });
            continue;
          }

          // Validate role
          const validRoles = ["ADMIN", "ACCOUNTS_MANAGER", "ENTRY_MANAGER"];
          if (!validRoles.includes(session.role)) {
            throw new Error("Invalid user role");
          }

          journalEntriesToCreate.push({
            entityId,
            date,
            description: row.Description,
            status: "FINALIZED" as const,
            category: row.Category,
            createdById: null,
            createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER",
            importBatch,
          });
        } else if (source === "petty-cash") {
          // Validate petty cash transaction
          if (dataType !== "expense") {
            errors.push({
              row: rowNumber,
              error: "Petty cash only supports expense transactions",
            });
            continue;
          }

          const pettyCashPeriod = allPettyCashPeriods.find(
            (p) =>
              p.entityId === entityId &&
              p.periodStart <= date &&
              p.periodEnd >= date
          );

          if (!pettyCashPeriod) {
            errors.push({
              row: rowNumber,
              error: "No active petty cash period for this date",
            });
            continue;
          }

          pettyCashEntriesToCreate.push({
            periodId: pettyCashPeriod.id,
            entityId,
            date,
            description: row.Description,
            amount: Math.abs(amount),
            currency: "BDT",
            createdById: null,
            journalData: {
              entityId,
              date,
              description: row.Description,
              status: "FINALIZED" as const,
              category: row.Category,
              createdById: null,
              createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER",
              importBatch,
            },
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Row ${rowNumber} error:`, err);
        errors.push({ row: rowNumber, error: msg });
      }
    }

    // Second pass: create all records
    console.log(`Creating ${journalEntriesToCreate.length} journal entries and ${pettyCashEntriesToCreate.length} petty cash entries...`);

    if (journalEntriesToCreate.length > 0) {
      let successCount = 0;
      // Create in batches of 100 to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < journalEntriesToCreate.length; i += batchSize) {
        const batch = journalEntriesToCreate.slice(i, i + batchSize);
        try {
          await prisma.journalEntry.createMany({
            data: batch,
            skipDuplicates: true
          });
          successCount += batch.length;
        } catch (err) {
          console.error(`Failed to create journal entry batch [${i}-${i + batchSize}]:`, err);
          // Fall back to individual creates
          for (const entry of batch) {
            try {
              await prisma.journalEntry.create({ data: entry });
              successCount++;
            } catch (batchErr) {
              console.error("Failed to create journal entry:", entry, batchErr);
            }
          }
        }
      }
      created += successCount;
      console.log(`Successfully created ${successCount}/${journalEntriesToCreate.length} journal entries`);
    }

    if (pettyCashEntriesToCreate.length > 0) {
      console.log(`Creating ${pettyCashEntriesToCreate.length} petty cash entries with journals...`);
      let successCount = 0;

      // Get default OPEX and Petty Cash accounts per entity
      const [expenseAccounts, pettyCashAccounts] = await Promise.all([
        prisma.chartOfAccounts.findMany({
          where: { pfAccount: "OPEX" },
          select: { id: true, entityId: true },
        }),
        prisma.chartOfAccounts.findMany({
          where: { accountCode: "1200" }, // Petty Cash Float account
          select: { id: true, entityId: true },
        }),
      ]);

      const expenseAccountMap = new Map(
        expenseAccounts.map((acc) => [acc.entityId, acc.id])
      );
      const pettyCashAccountMap = new Map(
        pettyCashAccounts.map((acc) => [acc.entityId, acc.id])
      );

      // Batch petty cash entries without journals for speed
      const pettyCashWithoutJournal = [];
      const pettyCashWithJournal = [];

      for (const entryWithJournal of pettyCashEntriesToCreate) {
        const { journalData, amount, ...pettyCashData } = entryWithJournal as any;
        const expenseAccountId = expenseAccountMap.get(pettyCashData.entityId);
        const pettyCashAccountId = pettyCashAccountMap.get(pettyCashData.entityId);

        if (!expenseAccountId || !pettyCashAccountId) {
          pettyCashWithoutJournal.push(pettyCashData);
        } else {
          pettyCashWithJournal.push({ journalData, pettyCashData, expenseAccountId, pettyCashAccountId, amount });
        }
      }

      // Batch create petty cash entries without journals
      const batchSize = 100;
      if (pettyCashWithoutJournal.length > 0) {
        for (let i = 0; i < pettyCashWithoutJournal.length; i += batchSize) {
          const batch = pettyCashWithoutJournal.slice(i, i + batchSize);
          try {
            await prisma.pettyCashEntry.createMany({
              data: batch,
              skipDuplicates: true
            });
            successCount += batch.length;
          } catch (err) {
            console.error(`Failed to batch create petty cash entries [${i}-${i + batchSize}]:`, err);
          }
        }
      }

      // Create petty cash entries with journals (must be sequential to get IDs)
      for (const { journalData, pettyCashData, expenseAccountId, pettyCashAccountId, amount } of pettyCashWithJournal) {
        try {
          const journalEntry = await prisma.journalEntry.create({
            data: {
              ...journalData,
              lines: {
                create: [
                  // DEBIT: OPEX account
                  {
                    accountId: expenseAccountId,
                    pfAccount: "OPEX",
                    entryType: TxnType.DEBIT,
                    amount: amount,
                    currency: "BDT",
                    entityId: journalData.entityId,
                  },
                  // CREDIT: Petty Cash Float account
                  {
                    accountId: pettyCashAccountId,
                    pfAccount: null,
                    entryType: TxnType.CREDIT,
                    amount: amount,
                    currency: "BDT",
                    entityId: journalData.entityId,
                  },
                ],
              },
            },
          });

          await prisma.pettyCashEntry.create({
            data: {
              ...pettyCashData,
              journalEntryId: journalEntry.id,
            },
          });
          successCount++;
        } catch (err) {
          console.error("Failed to create petty cash entry with journal:", err);
        }
      }
      created += successCount;
      console.log(`Successfully created ${successCount}/${pettyCashEntriesToCreate.length} petty cash entries with journals`);
    }

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
    console.error("Import error:", err);
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 }
    );
  }
}
