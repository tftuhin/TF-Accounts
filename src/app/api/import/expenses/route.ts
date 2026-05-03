import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface CSVRow {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
  Entity: string;
}

const REQUIRED_COLUMNS = ["Date", "Description", "Amount", "Category", "Entity"];

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim());

  // Validate headers
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const row: Partial<CSVRow> = {};

    headers.forEach((header, index) => {
      row[header as keyof CSVRow] = values[index] || "";
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
    const source = formData.get("source") as string;
    const bankAccountId = formData.get("bankAccountId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
        // Validate required fields
        if (!row.Date || !row.Description || !row.Amount || !row.Category || !row.Entity) {
          errors.push({ row: rowNumber, error: "Missing required field" });
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

        // Find entity
        const entity = await prisma.entity.findFirst({
          where: {
            name: { equals: row.Entity, mode: "insensitive" },
          },
        });

        if (!entity) {
          errors.push({ row: rowNumber, error: `Entity "${row.Entity}" not found` });
          continue;
        }

        if (source === "bank") {
          // Create journal entry for bank expense
          if (!bankAccountId) {
            errors.push({ row: rowNumber, error: "Bank account not selected" });
            continue;
          }

          const bankAccount = await prisma.bankAccount.findFirst({
            where: { id: bankAccountId, entityId: entity.id },
          });

          if (!bankAccount) {
            errors.push({ row: rowNumber, error: "Bank account not found for this entity" });
            continue;
          }

          // Create journal entry
          await prisma.journalEntry.create({
            data: {
              entityId: entity.id,
              date,
              description: row.Description,
              status: "FINALIZED",
              category: row.Category,
              createdById: null,
              createdByRole: session.role as any,
            },
          });

          created++;
        } else if (source === "petty-cash") {
          // Create petty cash entry
          const pettyCashPeriod = await prisma.pettyCashPeriod.findFirst({
            where: {
              entityId: entity.id,
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
              entityId: entity.id,
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
