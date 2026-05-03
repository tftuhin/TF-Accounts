import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface CSVRow {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
  Entity?: string;
}

const REQUIRED_COLUMNS = ["Date", "Description", "Amount", "Category"];

function detectDelimiter(line: string): string {
  const delimiters = [",", ";", "\t", "|"];
  let bestDelimiter = ",";
  let maxCount = 0;

  for (const delim of delimiters) {
    const count = line.split(delim).length;
    if (count > maxCount) {
      maxCount = count;
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

  const delimiter = detectDelimiter(lines[0]);
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

    // Pre-load chart of accounts for petty cash expense lines
    console.log("Pre-loading chart of accounts...");
    const expenseAccounts = await prisma.chartOfAccounts.findMany({
      where: { pfAccount: "OPEX" },
      select: { id: true, entityId: true },
    });
    const expenseAccountMap = new Map(
      expenseAccounts.map((acc) => [acc.entityId, acc.id])
    );

    // Create missing OPEX accounts for entities
    console.log("Creating missing OPEX accounts...");
    for (const entity of allEntities) {
      if (!expenseAccountMap.has(entity.id)) {
        try {
          const account = await prisma.chartOfAccounts.create({
            data: {
              entityId: entity.id,
              accountCode: "5000",
              accountName: "Operating Expenses",
              accountGroup: "expense",
              pfAccount: "OPEX",
            },
          });
          expenseAccountMap.set(entity.id, account.id);
          console.log(`Created OPEX account for entity ${entity.name}`);
        } catch (err) {
          console.error(`Failed to create OPEX account for entity ${entity.id}:`, err);
        }
      }
    }

    // Prepare batch arrays
    const journalEntriesToCreate: any[] = [];
    const pettyCashEntriesToCreate: any[] = [];
    const journalEntryLinesToCreate: any[] = [];
    const pettyCashWithJournalData: Array<{
      pettyCashData: any;
      journalEntryData: any;
      lineData: any[];
    }> = [];

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

        // Parse and validate amount
        const amount = parseFloat(row.Amount);
        if (isNaN(amount)) {
          errors.push({ row: rowNumber, error: "Invalid amount" });
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

          const expenseAccountId = expenseAccountMap.get(entityId);
          if (!expenseAccountId) {
            errors.push({
              row: rowNumber,
              error: "No OPEX account found for this entity",
            });
            continue;
          }

          const journalEntryData = {
            entityId,
            date,
            description: row.Description,
            status: "FINALIZED" as const,
            category: row.Category,
            createdById: null,
            createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER",
            importBatch,
          };

          const pettyCashData = {
            periodId: pettyCashPeriod.id,
            entityId,
            date,
            description: row.Description,
            amount: Math.abs(amount),
            currency: "BDT",
            createdById: null,
          };

          const lineData = [
            {
              accountId: expenseAccountId,
              pfAccount: "OPEX" as const,
              entryType: "DEBIT" as const,
              amount: Math.abs(amount),
              currency: "BDT",
              entityId,
            },
          ];

          pettyCashWithJournalData.push({
            journalEntryData,
            pettyCashData,
            lineData,
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
      for (const entry of journalEntriesToCreate) {
        try {
          await prisma.journalEntry.create({ data: entry });
          successCount++;
        } catch (err) {
          console.error("Failed to create journal entry:", entry, err);
        }
      }
      created += successCount;
      console.log(`Successfully created ${successCount}/${journalEntriesToCreate.length} journal entries`);
    }

    if (pettyCashWithJournalData.length > 0) {
      let successCount = 0;
      for (const { journalEntryData, pettyCashData, lineData } of pettyCashWithJournalData) {
        try {
          // Create journal entry first
          const journalEntry = await prisma.journalEntry.create({
            data: {
              ...journalEntryData,
              lines: {
                create: lineData,
              },
            },
          });

          // Then create petty cash entry linked to journal entry
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
      console.log(`Successfully created ${successCount}/${pettyCashWithJournalData.length} petty cash entries with journals`);
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
