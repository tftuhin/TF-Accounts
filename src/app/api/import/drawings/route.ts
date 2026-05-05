import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TxnType } from "@prisma/client";
import { ensureBasicAccounts } from "@/lib/accounts";

interface DrawingRow {
  date: string;
  description: string;
  amount: number;
  sourceAccount: "PROFIT" | "OWNERS_COMP";
  ownershipRegistryId: string;
}

const REQUIRED_COLUMNS = ["date", "description", "amount", "sourceAccount", "ownershipRegistryId"];

function detectDelimiter(lines: string[]): string {
  const delimiters = ["\t", ",", ";", "|"];
  const results = [];

  for (const delim of delimiters) {
    const counts: number[] = [];
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      counts.push(lines[i].split(delim).length);
    }
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    results.push({ delim, avgCount });
  }

  const tabResult = results.find(r => r.delim === "\t");
  if (tabResult && tabResult.avgCount >= 2 && tabResult.avgCount <= 6) {
    return "\t";
  }

  for (const result of results) {
    if (result.avgCount >= 2 && result.avgCount <= 6) {
      return result.delim;
    }
  }

  return ",";
}

function parseValue(value: string): string {
  return value.trim().replace(/^["'](.*)["']$/, "$1").trim();
}

function parseCSV(content: string): DrawingRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const headers = lines[0].split(delimiter).map(parseValue);

  const headerLower = headers.map((h) => h.toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headerLower.includes(col.toLowerCase()));
  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Found: ${headers.join(", ")}`
    );
  }

  const rows: DrawingRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);
    const row: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase();
      if (REQUIRED_COLUMNS.includes(normalizedHeader)) {
        row[normalizedHeader] = values[index] || "";
      }
    });

    if (!row.date || !row.description || row.amount === "" || !row.sourceAccount || !row.ownershipRegistryId) {
      throw new Error(`Missing required fields at row ${i + 1}`);
    }

    const amount = parseFloat(row.amount.toString());
    if (isNaN(amount) || amount < 0) {
      throw new Error(`Invalid amount at row ${i + 1}: ${row.amount}`);
    }

    if (!["PROFIT", "OWNERS_COMP"].includes(row.sourceAccount.toUpperCase())) {
      throw new Error(`Invalid sourceAccount at row ${i + 1}: ${row.sourceAccount}. Must be PROFIT or OWNERS_COMP`);
    }

    rows.push({
      date: row.date,
      description: row.description,
      amount,
      sourceAccount: row.sourceAccount.toUpperCase() as "PROFIT" | "OWNERS_COMP",
      ownershipRegistryId: row.ownershipRegistryId,
    });
  }

  return rows;
}

function parseJSON(content: string): DrawingRow[] {
  let data = JSON.parse(content);
  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an array of drawing entries");
  }

  const rows: DrawingRow[] = entries.map((entry, idx) => {
    const date = entry.date || entry.Date;
    const description = entry.description || entry.Description;
    const amount = entry.amount !== undefined ? entry.amount : (entry.Amount !== undefined ? entry.Amount : "");
    const sourceAccount = entry.sourceAccount || entry.SourceAccount;
    const ownershipRegistryId = entry.ownershipRegistryId || entry.OwnershipRegistryId;

    if (!date || !description || amount === "" || !sourceAccount || !ownershipRegistryId) {
      throw new Error(`Missing required fields at row ${idx + 1}`);
    }

    const parsedAmount = parseFloat(amount.toString());
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      throw new Error(`Invalid amount at row ${idx + 1}: ${amount}`);
    }

    if (!["PROFIT", "OWNERS_COMP"].includes(sourceAccount.toUpperCase())) {
      throw new Error(`Invalid sourceAccount at row ${idx + 1}: ${sourceAccount}`);
    }

    return {
      date,
      description,
      amount: parsedAmount,
      sourceAccount: sourceAccount.toUpperCase() as "PROFIT" | "OWNERS_COMP",
      ownershipRegistryId,
    };
  });

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
    const entityId = formData.get("entityId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!entityId) {
      return NextResponse.json({ error: "Entity required" }, { status: 400 });
    }

    console.log(`Starting owner withdrawal import: ${file.name}, size: ${file.size} bytes`);
    const content = await file.text();

    // Parse file
    let rows: DrawingRow[];
    if (file.name.endsWith('.json')) {
      console.log(`JSON file detected, parsing...`);
      rows = parseJSON(content);
    } else {
      console.log(`CSV file detected, parsing...`);
      rows = parseCSV(content);
    }

    console.log(`Successfully parsed ${rows.length} rows`);

    if (rows.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const errors: Array<{ row: number; error: string }> = [];
    let created = 0;

    // Ensure basic accounts exist for entity
    console.log(`Ensuring basic accounts exist for entity ${entityId}`);
    await ensureBasicAccounts(entityId);

    const importBatchId = `import-drawings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Batch process drawings
    const batchSize = 30;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const promises = batch.map(async (row, batchIndex) => {
        const rowNumber = i + batchIndex + 2;

        try {
          // Verify ownership registry exists
          const ownershipRegistry = await prisma.ownershipRegistry.findUnique({
            where: { id: row.ownershipRegistryId },
            select: { id: true, ownerName: true },
          });

          if (!ownershipRegistry) {
            errors.push({ row: rowNumber, error: `Ownership registry not found: ${row.ownershipRegistryId}` });
            return false;
          }

          const drawingDate = new Date(row.date);
          if (isNaN(drawingDate.getTime())) {
            errors.push({ row: rowNumber, error: `Invalid date: ${row.date}` });
            return false;
          }

          // Get current balance for source account
          const lines = await prisma.journalEntryLine.findMany({
            where: {
              entityId,
              pfAccount: row.sourceAccount,
              journalEntry: { status: "FINALIZED" },
            },
            select: { entryType: true, amount: true },
          });

          const currentBalance = lines.reduce((sum, l) => {
            const amt = Number(l.amount);
            return sum + (l.entryType === "CREDIT" ? amt : -amt);
          }, 0);

          // Get accounts
          const accounts = await ensureBasicAccounts(entityId);

          // Create journal entry
          const sourceLabel = row.sourceAccount === "PROFIT" ? "Profit" : "Owners Compensation";
          const journalEntry = await prisma.journalEntry.create({
            data: {
              entityId,
              date: drawingDate,
              description: row.description,
              status: "FINALIZED",
              category: "Owner Drawing",
              createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER",
              createdById: null,
              importBatch: importBatchId,
              lines: {
                create: [
                  {
                    accountId: accounts.drawings.id,
                    pfAccount: row.sourceAccount,
                    entryType: TxnType.DEBIT,
                    amount: row.amount,
                    currency: "BDT",
                    entityId,
                    memo: `${ownershipRegistry.ownerName} drawing from ${sourceLabel}`,
                  },
                  {
                    accountId: accounts.cash.id,
                    pfAccount: null,
                    entryType: TxnType.CREDIT,
                    amount: row.amount,
                    currency: "BDT",
                    entityId,
                    memo: `Funds withdrawn - ${ownershipRegistry.ownerName}`,
                  },
                ],
              },
            },
          });

          // Create drawing record
          await prisma.drawing.create({
            data: {
              entityId,
              ownershipRegistryId: row.ownershipRegistryId,
              sourceAccount: row.sourceAccount,
              amount: row.amount,
              date: drawingDate,
              status: row.amount > currentBalance ? "PENDING" : "COMPLETED",
              note: `Imported from ${file.name}`,
              accountBalanceAtDraw: currentBalance,
              createdById: null,
            },
          });

          return true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create drawing";
          console.error(`Row ${rowNumber} creation error:`, err);
          errors.push({ row: rowNumber, error: msg });
          return false;
        }
      });

      const results = await Promise.all(promises);
      const batchSuccess = results.filter(r => r).length;
      created += batchSuccess;

      if (i % 100 === 0) {
        console.log(`Progress: ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
      }
    }

    console.log(`Successfully created ${created}/${rows.length} owner withdrawal entries`);

    return NextResponse.json({
      success: true,
      data: {
        created,
        errors: errors.length > 0 ? errors : undefined,
        importBatch: importBatchId,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Owner withdrawal import error:", err);
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 }
    );
  }
}
