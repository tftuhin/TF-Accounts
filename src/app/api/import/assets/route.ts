import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TxnType } from "@prisma/client";
import { ensureBasicAccounts } from "@/lib/accounts";

interface AssetRow {
  name: string;
  description?: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  currency?: string;
  usefulLifeYears: number;
  salvageValue?: number;
}

const REQUIRED_COLUMNS = ["name", "category", "purchasedate", "purchasecost", "usefullifeyears"];

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

function parseCSV(content: string): AssetRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const headers = lines[0].split(delimiter).map(parseValue);

  const headerLower = headers.map((h) => h.toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headerLower.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Found: ${headers.join(", ")}`
    );
  }

  const rows: AssetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);
    const row: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase();
      row[normalizedHeader] = values[index] || "";
    });

    if (!row.name || !row.category || !row.purchasedate || !row.purchasecost || !row.usefullifeyears) {
      throw new Error(`Missing required fields at row ${i + 1}`);
    }

    const cost = parseFloat(row.purchasecost.toString());
    if (isNaN(cost)) {
      throw new Error(`Invalid purchase cost at row ${i + 1}: ${row.purchasecost}`);
    }

    const years = parseInt(row.usefullifeyears.toString());
    if (isNaN(years) || years <= 0) {
      throw new Error(`Invalid useful life years at row ${i + 1}: ${row.usefullifeyears}`);
    }

    const salvage = row.salvagevalue ? parseFloat(row.salvagevalue.toString()) : 0;
    if (isNaN(salvage)) {
      throw new Error(`Invalid salvage value at row ${i + 1}: ${row.salvagevalue}`);
    }

    const category = row.category.toString().toUpperCase();
    if (!["COMPUTER_ELECTRONICS", "FURNITURE_FIXTURES", "VEHICLES", "SOFTWARE_LICENSES", "OFFICE_EQUIPMENT", "LAND_BUILDING", "OTHER"].includes(category)) {
      throw new Error(`Invalid category at row ${i + 1}: ${row.category}`);
    }

    rows.push({
      name: row.name,
      description: row.description || undefined,
      category,
      purchaseDate: row.purchasedate,
      purchaseCost: cost,
      currency: (row.currency || "BDT").toString().toUpperCase(),
      usefulLifeYears: years,
      salvageValue: salvage,
    });
  }

  return rows;
}

function parseJSON(content: string): AssetRow[] {
  let data = JSON.parse(content);
  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an array of asset entries");
  }

  const rows: AssetRow[] = entries.map((entry, idx) => {
    const name = entry.name || entry.Name;
    const category = entry.category || entry.Category;
    const purchaseDate = entry.purchaseDate || entry.PurchaseDate;
    const purchaseCost = entry.purchaseCost || entry.PurchaseCost;
    const usefulLifeYears = entry.usefulLifeYears || entry.UsefulLifeYears;
    const description = entry.description || entry.Description;
    const salvageValue = entry.salvageValue || entry.SalvageValue;
    const currency = entry.currency || entry.Currency || "BDT";

    if (!name || !category || !purchaseDate || purchaseCost === undefined || !usefulLifeYears) {
      throw new Error(`Missing required fields at row ${idx + 1}`);
    }

    const cost = parseFloat(purchaseCost.toString());
    if (isNaN(cost)) {
      throw new Error(`Invalid purchase cost at row ${idx + 1}: ${purchaseCost}`);
    }

    const years = parseInt(usefulLifeYears.toString());
    if (isNaN(years) || years <= 0) {
      throw new Error(`Invalid useful life years at row ${idx + 1}: ${usefulLifeYears}`);
    }

    const salvage = salvageValue ? parseFloat(salvageValue.toString()) : 0;
    if (isNaN(salvage)) {
      throw new Error(`Invalid salvage value at row ${idx + 1}: ${salvageValue}`);
    }

    const categoryUpper = category.toString().toUpperCase();
    if (!["COMPUTER_ELECTRONICS", "FURNITURE_FIXTURES", "VEHICLES", "SOFTWARE_LICENSES", "OFFICE_EQUIPMENT", "LAND_BUILDING", "OTHER"].includes(categoryUpper)) {
      throw new Error(`Invalid category at row ${idx + 1}: ${category}`);
    }

    return {
      name,
      description,
      category: categoryUpper,
      purchaseDate,
      purchaseCost: cost,
      currency: currency.toString().toUpperCase(),
      usefulLifeYears: years,
      salvageValue: salvage,
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

    console.log(`Starting asset purchase import: ${file.name}, size: ${file.size} bytes`);
    const content = await file.text();

    // Parse file
    let rows: AssetRow[];
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
    const accounts = await ensureBasicAccounts(entityId);

    const importBatchId = `import-assets-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Batch process assets
    const batchSize = 30;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const promises = batch.map(async (row, batchIndex) => {
        const rowNumber = i + batchIndex + 2;

        try {
          const assetDate = new Date(row.purchaseDate);
          if (isNaN(assetDate.getTime())) {
            errors.push({ row: rowNumber, error: `Invalid purchase date: ${row.purchaseDate}` });
            return false;
          }

          // Create journal entry (debit asset, credit cash/liability)
          const journalEntry = await prisma.journalEntry.create({
            data: {
              entityId,
              date: assetDate,
              description: `Asset purchase: ${row.name}`,
              status: "FINALIZED",
              category: "Asset Purchase",
              createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER",
              createdById: null,
              importBatch: importBatchId,
              lines: {
                create: [
                  {
                    accountId: accounts.fixedAssets.id,
                    pfAccount: null,
                    entryType: TxnType.DEBIT,
                    amount: row.purchaseCost,
                    currency: row.currency as any,
                    entityId,
                    memo: `${row.name}${row.description ? `: ${row.description}` : ""}`,
                  },
                  {
                    accountId: accounts.cash.id,
                    pfAccount: null,
                    entryType: TxnType.CREDIT,
                    amount: row.purchaseCost,
                    currency: row.currency as any,
                    entityId,
                    memo: `Payment for asset purchase - ${row.name}`,
                  },
                ],
              },
            },
          });

          // Create fixed asset record
          // Note: createdById must be set due to database constraint, use session.id if available
          await prisma.fixedAsset.create({
            data: {
              entityId,
              name: row.name,
              description: row.description,
              category: row.category as any,
              purchaseDate: assetDate,
              purchaseCost: row.purchaseCost,
              currency: row.currency as any,
              usefulLifeYears: row.usefulLifeYears,
              salvageValue: row.salvageValue || 0,
              journalEntryId: journalEntry.id,
              createdById: session.id,
            },
          });

          return true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create asset";
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

    console.log(`Successfully created ${created}/${rows.length} asset entries`);

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
    console.error("Asset import error:", err);
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 }
    );
  }
}
