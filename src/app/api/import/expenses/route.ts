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

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; error: string }> = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because header is row 1

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
          const entity = await prisma.entity.findFirst({
            where: {
              name: { equals: row.Entity, mode: "insensitive" },
            },
          });

          if (!entity) {
            errors.push({
              row: rowNumber,
              error: `Entity "${row.Entity}" not found`,
            });
            continue;
          }
          entityId = entity.id;
        }

        if (source === "bank") {
          // Create journal entry for bank transaction
          if (!bankAccountId) {
            errors.push({ row: rowNumber, error: "Bank account not selected" });
            continue;
          }

          const bankAccount = await prisma.bankAccount.findFirst({
            where: { id: bankAccountId, entityId },
          });

          if (!bankAccount) {
            errors.push({
              row: rowNumber,
              error: "Bank account not found for this entity",
            });
            continue;
          }

          // Create journal entry
          const validRoles = ["ADMIN", "ACCOUNTS_MANAGER", "ENTRY_MANAGER"];
          if (!validRoles.includes(session.role)) {
            throw new Error("Invalid user role");
          }
          
          await prisma.journalEntry.create({
            data: {
              entityId,
              date,
              description: row.Description,
              status: "FINALIZED",
              category: row.Category,
              createdById: null,
              createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER",
            },
          });

          created++;
        } else if (source === "petty-cash") {
          // Create petty cash entry (only for expenses)
          if (dataType !== "expense") {
            errors.push({
              row: rowNumber,
              error: "Petty cash only supports expense transactions",
            });
            continue;
          }

          const pettyCashPeriod = await prisma.pettyCashPeriod.findFirst({
            where: {
              entityId,
              periodStart: { lte: date },
              periodEnd: { gte: date },
              isClosed: false,
            },
          });

          if (!pettyCashPeriod) {
            errors.push({
              row: rowNumber,
              error: "No active petty cash period for this date",
            });
            continue;
          }

          await prisma.pettyCashEntry.create({
            data: {
              periodId: pettyCashPeriod.id,
              entityId,
              date,
              description: row.Description,
              amount: Math.abs(amount),
              currency: "BDT",
              createdById: null,
            },
          });

          created++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Row ${rowNumber} error:`, err);
        errors.push({ row: rowNumber, error: msg });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
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
