import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TxnType } from "@prisma/client";

interface IncomeRow {
  Date: string;
  Description: string;
  Amount: string;
  Currency?: string;
  Entity?: string;
  DepositedAccount?: string;
}

const REQUIRED_COLUMNS = ["Date", "Description", "Amount"];

function detectDelimiter(lines: string[]): string {
  const delimiters = ["\t", ",", ";", "|"];

  console.log(`[CSV Parse] Analyzing ${lines.length} lines for delimiter detection`);
  console.log(`[CSV Parse] First line: "${lines[0].substring(0, 120)}..."`);

  const results = [];

  for (const delim of delimiters) {
    const counts: number[] = [];
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      counts.push(lines[i].split(delim).length);
    }

    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    results.push({ delim, avgCount, minCount, maxCount });
    console.log(`[CSV Parse] Delimiter '${delim === '\t' ? 'TAB' : delim}': min=${minCount}, avg=${avgCount.toFixed(1)}, max=${maxCount} columns`);
  }

  // RULE 1: If tab produces consistent columns, use it
  const tabResult = results.find(r => r.delim === "\t");
  if (tabResult && tabResult.avgCount >= 4 && tabResult.avgCount <= 6 && tabResult.maxCount <= 7) {
    console.log(`[CSV Parse] ✓ Using TAB (consistent columns)`);
    return "\t";
  }

  // RULE 2: Pick delimiter with 4-6 columns
  for (const result of results) {
    if (result.avgCount >= 4 && result.avgCount <= 6) {
      console.log(`[CSV Parse] ✓ Using '${result.delim === '\t' ? 'TAB' : result.delim}' (matches column range)`);
      return result.delim;
    }
  }

  console.log(`[CSV Parse] ✓ Using comma (fallback)`);
  return ",";
}

function parseValue(value: string): string {
  return value
    .trim()
    .replace(/^["'](.*)["']$/, "$1")
    .trim();
}

function parseCSV(content: string): IncomeRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const delimiterName = delimiter === '\t' ? 'TAB' : delimiter;

  const headerLine = lines[0];
  const headers = headerLine.split(delimiter).map(parseValue);

  console.log(`[CSV Parse] Using delimiter: ${delimiterName}`);
  console.log(`[CSV Parse] Headers: [${headers.join(" | ")}]`);

  // Validate headers (case-insensitive)
  const headerLower = headers.map((h) => h.toLowerCase());
  const requiredLower = REQUIRED_COLUMNS.map((c) => c.toLowerCase());
  const missingColumns = requiredLower.filter((col) => !headerLower.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Found: ${headers.join(", ")}`
    );
  }

  const rows: IncomeRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);

    if (values.length < headers.length) {
      while (values.length < headers.length) {
        values.push("");
      }
    }

    const row: Partial<IncomeRow> = {};

    headers.forEach((header, index) => {
      const normalizedHeader = REQUIRED_COLUMNS.concat("Entity", "DepositedAccount").find(
        (col) => col.toLowerCase() === header.toLowerCase()
      ) as keyof IncomeRow;
      if (normalizedHeader) {
        row[normalizedHeader] = values[index] || "";
      }
    });

    rows.push(row as IncomeRow);
  }

  return rows;
}

function parseJSON(content: string): IncomeRow[] {
  console.log(`[JSON Parse] Parsing JSON content (${content.length} chars)`);

  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON format: ${err instanceof Error ? err.message : String(err)}`);
  }

  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an 'entries' array or be an array of objects");
  }

  console.log(`[JSON Parse] Found ${entries.length} entries`);
  console.log(`[JSON Parse] Sample entry: ${JSON.stringify(entries[0])}`);

  // Validate required columns in first entry
  const firstEntry = entries[0];
  const requiredLower = REQUIRED_COLUMNS.map((c) => c.toLowerCase());
  const missingColumns = requiredLower.filter((col) => !Object.keys(firstEntry).some(key => key.toLowerCase() === col));

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Found: ${Object.keys(firstEntry).join(", ")}`
    );
  }

  // Convert entries to IncomeRow format
  const rows: IncomeRow[] = entries.map((entry) => {
    const row: Partial<IncomeRow> = {};

    REQUIRED_COLUMNS.concat("Entity", "DepositedAccount").forEach((col) => {
      let key = Object.keys(entry).find(k => k.toLowerCase() === col.toLowerCase());

      // Accept "sub_brand" as alias for "Entity"
      if (!key && col.toLowerCase() === "entity") {
        key = Object.keys(entry).find(k => k.toLowerCase() === "sub_brand");
      }

      // Accept various account field names
      if (!key && col.toLowerCase() === "depositedaccount") {
        key = Object.keys(entry).find(k =>
          k.toLowerCase() === "deposited_account" ||
          k.toLowerCase() === "deposited account" ||
          k.toLowerCase() === "accountname" ||
          k.toLowerCase() === "account"
        );
      }

      if (key && entry[key] !== null && entry[key] !== undefined && entry[key] !== "null") {
        row[col as keyof IncomeRow] = String(entry[key]).trim();
      }
    });

    return row as IncomeRow;
  });

  console.log(`[JSON Parse] Converted ${rows.length} entries to income format`);
  return rows;
}

async function ensureBasicAccounts(entityId: string): Promise<{ assetAccountId: string; revenueAccountId: string }> {
  // Ensure asset account exists
  let assetAccount = await prisma.chartOfAccounts.findFirst({
    where: { entityId, accountGroup: "asset" },
    select: { id: true },
  });

  if (!assetAccount) {
    assetAccount = await prisma.chartOfAccounts.create({
      data: {
        entityId,
        accountCode: "1000",
        accountName: "Bank Account",
        accountGroup: "asset",
      },
      select: { id: true },
    });
    console.log(`Created asset account ${assetAccount.id} for entity ${entityId}`);
  }

  // Ensure revenue account exists
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
    console.log(`Created Sales Revenue account ${revenueAccount.id} for entity ${entityId}`);
  }

  return { assetAccountId: assetAccount.id, revenueAccountId: revenueAccount.id };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const defaultEntityId = formData.get("defaultEntityId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!defaultEntityId) {
      return NextResponse.json({ error: "Default entity required" }, { status: 400 });
    }

    console.log(`Starting income import: ${file.name}, size: ${file.size} bytes`);
    const content = await file.text();

    // Parse file
    let rows: IncomeRow[];
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

    const importBatch = `import-income-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Import batch ID: ${importBatch}`);

    // Pre-load entities and bank accounts
    console.log("Pre-loading entities and bank accounts...");
    const [allEntities, bankAccounts] = await Promise.all([
      prisma.entity.findMany({
        select: { id: true, name: true },
      }),
      prisma.bankAccount.findMany({
        select: { id: true, entityId: true, accountName: true },
      }),
    ]);

    const entityMap = new Map(allEntities.map((e) => [e.name.toLowerCase(), e.id]));
    const accountMap = new Map(bankAccounts.map((a) => [a.accountName.toLowerCase(), a.id]));
    const entityByAccountMap = new Map(bankAccounts.map((a) => [a.id, a.entityId]));

    console.log(`Pre-loaded ${allEntities.length} entities, ${bankAccounts.length} bank accounts`);

    // Collect entries for creation
    const entriesToCreate: any[] = [];

    // First pass: validate
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      if (i % 100 === 0) {
        console.log(`Validating row ${i}...`);
      }

      try {
        if (!row.Date || !row.Description || !row.Amount) {
          errors.push({
            row: rowNumber,
            error: `Missing field: ${
              !row.Date ? "Date" : !row.Description ? "Description" : "Amount"
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

        // Parse amount
        let amountStr = row.Amount.toString().trim();
        amountStr = amountStr.replace(/[^\d.,\-]/g, "").trim();

        if (amountStr.includes(",") && amountStr.includes(".")) {
          const lastCommaIndex = amountStr.lastIndexOf(",");
          const lastDotIndex = amountStr.lastIndexOf(".");
          if (lastDotIndex > lastCommaIndex) {
            amountStr = amountStr.replace(/,/g, "");
          } else {
            amountStr = amountStr.replace(/\./g, "").replace(",", ".");
          }
        } else if (amountStr.includes(",")) {
          const commaCount = (amountStr.match(/,/g) || []).length;
          if (commaCount === 1) {
            const afterComma = amountStr.split(",")[1];
            if (afterComma && afterComma.length <= 2) {
              amountStr = amountStr.replace(",", ".");
            } else {
              amountStr = amountStr.replace(/,/g, "");
            }
          } else {
            amountStr = amountStr.replace(/,/g, "");
          }
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount === 0) {
          errors.push({ row: rowNumber, error: `Invalid amount: "${row.Amount}"` });
          continue;
        }

        // Determine entity
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

        // Determine bank account
        let bankAccountId: string | null = null;
        if (row.DepositedAccount && row.DepositedAccount.trim()) {
          const searchName = row.DepositedAccount.trim().toLowerCase();

          // Try exact match first
          bankAccountId = accountMap.get(searchName) || null;

          // If no exact match, try partial match (bidirectional - either contains the other)
          if (!bankAccountId) {
            const partialMatch = bankAccounts.find(a => {
              const accountNameLower = a.accountName.toLowerCase();
              return (
                a.entityId === entityId &&
                (accountNameLower.includes(searchName) || searchName.includes(accountNameLower))
              );
            });
            bankAccountId = partialMatch?.id || null;
          }

          if (!bankAccountId) {
            // If account not found, fall back to first available account for the entity
            const entityAccounts = bankAccounts.filter(a => a.entityId === entityId);
            if (entityAccounts.length > 0) {
              bankAccountId = entityAccounts[0].id;
              console.log(`Account "${row.DepositedAccount}" not found for entity, using fallback: ${entityAccounts[0].accountName}`);
            } else {
              errors.push({
                row: rowNumber,
                error: `Bank account "${row.DepositedAccount}" not found. No accounts available for entity.`,
              });
              continue;
            }
          }
        } else {
          // Find default bank account for entity
          const defaultAccount = bankAccounts.find(a => a.entityId === entityId);
          if (!defaultAccount) {
            errors.push({
              row: rowNumber,
              error: "No bank account found for entity",
            });
            continue;
          }
          bankAccountId = defaultAccount.id;
        }

        entriesToCreate.push({
          entityId,
          date,
          description: row.Description,
          amount: Math.abs(amount),
          currency: row.Currency || "BDT",
          bankAccountId,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Row ${rowNumber} error:`, err);
        errors.push({ row: rowNumber, error: msg });
      }
    }

    // Second pass: create journal entries
    console.log(`Creating ${entriesToCreate.length} income journal entries...`);

    if (entriesToCreate.length > 0) {
      // Ensure basic accounts exist for all entities
      const uniqueEntityIds = [...new Set(entriesToCreate.map(e => e.entityId))];
      console.log(`Ensuring basic accounts exist for ${uniqueEntityIds.length} entities...`);
      const salesAccountMap = new Map<string, string>();
      const assetAccountMap = new Map<string, string>();

      for (const entityId of uniqueEntityIds) {
        try {
          const { assetAccountId, revenueAccountId } = await ensureBasicAccounts(entityId);
          assetAccountMap.set(entityId, assetAccountId);
          salesAccountMap.set(entityId, revenueAccountId);
        } catch (err) {
          console.error(`Failed to ensure basic accounts for entity ${entityId}:`, err);
        }
      }

      // Get bank accounts with their chart of accounts
      const bankAccountsWithCharts = await prisma.bankAccount.findMany({
        where: { id: { in: [...new Set(entriesToCreate.map(e => e.bankAccountId))] } },
        select: {
          id: true,
          entityId: true,
          accountName: true
        },
      });

      // Map bank accounts to asset accounts
      const bankToChartMap = new Map<string, string>();
      for (const entityId of uniqueEntityIds) {
        const assetAccountId = assetAccountMap.get(entityId);
        if (assetAccountId) {
          bankAccountsWithCharts
            .filter(ba => ba.entityId === entityId)
            .forEach(ba => bankToChartMap.set(ba.id, assetAccountId));
        }
      }

      // Create journal entries in parallel batches
      const batchSize = 30;
      let successCount = 0;

      for (let i = 0; i < entriesToCreate.length; i += batchSize) {
        const batch = entriesToCreate.slice(i, i + batchSize);

        const promises = batch.map(async (entry) => {
          try {
            const salesAccountId = salesAccountMap.get(entry.entityId);
            const bankChartAccountId = bankToChartMap.get(entry.bankAccountId);

            if (!salesAccountId) {
              console.error(`No Sales Revenue account for entity ${entry.entityId}`);
              return false;
            }

            if (!bankChartAccountId) {
              console.error(`No asset chart account found for bank account ${entry.bankAccountId}`);
              return false;
            }

            await prisma.journalEntry.create({
              data: {
                entityId: entry.entityId,
                date: entry.date,
                description: entry.description,
                status: "FINALIZED",
                category: "Sales Revenue",
                createdById: null,
                createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER",
                importBatch,
                lines: {
                  create: [
                    {
                      accountId: bankChartAccountId,
                      entryType: TxnType.DEBIT,
                      amount: entry.amount,
                      currency: entry.currency,
                      entityId: entry.entityId,
                    },
                    {
                      accountId: salesAccountId,
                      pfAccount: "INCOME",
                      entryType: TxnType.CREDIT,
                      amount: entry.amount,
                      currency: entry.currency,
                      entityId: entry.entityId,
                    },
                  ],
                },
              },
            });
            return true;
          } catch (err) {
            console.error("Failed to create income entry:", err);
            return false;
          }
        });

        const results = await Promise.all(promises);
        const batchSuccess = results.filter(r => r).length;
        successCount += batchSuccess;

        if (i % 100 === 0) {
          console.log(`Progress: ${i + batch.length}/${entriesToCreate.length}`);
        }
      }

      created = successCount;
      console.log(`Successfully created ${successCount}/${entriesToCreate.length} income entries`);
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
    console.error("Income import error:", err);
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 }
    );
  }
}
