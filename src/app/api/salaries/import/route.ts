import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TxnType } from "@prisma/client";

interface SalaryRow {
  employeeName: string;
  amount: number;
  adjustment?: number;
  adjustmentNote?: string;
  month?: string;
  notes?: string;
}

const REQUIRED_COLUMNS = ["employeeName", "amount"];

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

function parseCSV(content: string): SalaryRow[] {
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

  const rows: SalaryRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);
    const row: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase();
      if (["employeename", "amount", "adjustment", "adjustmentnote", "month", "notes"].includes(normalizedHeader)) {
        row[normalizedHeader === "employeename" ? "employeeName" : normalizedHeader] = values[index] || "";
      }
    });

    if (!row.employeeName || !row.employeeName.trim()) {
      throw new Error(`Employee name missing at row ${i + 1}`);
    }

    const amountStr = row.amount.toString().trim().replace(/[^\d.,\-]/g, "").trim();
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount at row ${i + 1}: ${row.amount}`);
    }

    // Skip rows with 0 amount
    if (amount === 0) {
      continue;
    }

    const adjustment = row.adjustment ? parseFloat(row.adjustment.toString()) : undefined;

    rows.push({
      employeeName: row.employeeName,
      amount: Math.abs(amount),
      adjustment: adjustment && !isNaN(adjustment) ? adjustment : undefined,
      adjustmentNote: row.adjustmentNote || undefined,
      month: row.month || undefined,
      notes: row.notes || undefined,
    });
  }

  return rows;
}

function parseJSON(content: string): SalaryRow[] {
  let data = JSON.parse(content);
  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an array of salary entries");
  }

  const rows: (SalaryRow | null)[] = entries.map((entry, idx) => {
    const employeeName = entry.employeeName || entry.employee_name || entry.name;
    if (!employeeName) {
      throw new Error(`Employee name missing at row ${idx + 1}`);
    }

    const amountStr = (entry.amount || "").toString().trim();
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount at row ${idx + 1}: ${entry.amount}`);
    }

    // Skip rows with 0 amount
    if (amount === 0) {
      return null;
    }

    const adjustment = entry.adjustment ? parseFloat(entry.adjustment.toString()) : undefined;

    return {
      employeeName: employeeName.toString().trim(),
      amount: Math.abs(amount),
      adjustment: adjustment && !isNaN(adjustment) ? adjustment : undefined,
      adjustmentNote: entry.adjustmentNote || entry.adjustment_note || undefined,
      month: entry.month || undefined,
      notes: entry.notes || undefined,
    };
  });

  return rows.filter((row): row is SalaryRow => row !== null);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const date = formData.get("date") as string;
    const payPeriod = formData.get("payPeriod") as string;
    const entityId = formData.get("entityId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Date required" }, { status: 400 });
    }

    if (!entityId) {
      return NextResponse.json({ error: "Entity required" }, { status: 400 });
    }

    console.log(`Starting salary import: ${file.name}, size: ${file.size} bytes`);
    const content = await file.text();

    // Parse file
    let rows: SalaryRow[];
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

    const salaryDate = new Date(date);
    if (isNaN(salaryDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Ensure OPEX account exists for the entity
    console.log(`Ensuring OPEX account exists for entity ${entityId}`);
    let opexAccount = await prisma.chartOfAccounts.findFirst({
      where: { entityId, pfAccount: "OPEX" },
      select: { id: true },
    });

    if (!opexAccount) {
      opexAccount = await prisma.chartOfAccounts.create({
        data: {
          entityId,
          accountCode: "2000",
          accountName: "Operating Expenses",
          pfAccount: "OPEX",
          accountGroup: "expense",
        },
        select: { id: true },
      });
      console.log(`Created OPEX account ${opexAccount.id}`);
    }

    const importBatchId = `import-salary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create salary entries in batches
    const batchSize = 30;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const promises = batch.map(async (row, batchIndex) => {
        const rowNumber = i + batchIndex + 2;

        try {
          if (!row.employeeName || !row.amount) {
            errors.push({ row: rowNumber, error: "Missing employee name or amount" });
            return false;
          }

          // Find or create employee
          let employee = await prisma.employee.findFirst({
            where: {
              name: row.employeeName,
            },
            select: { id: true },
          });

          if (!employee) {
            employee = await prisma.employee.create({
              data: {
                name: row.employeeName,
                baseSalary: row.amount,
                status: "ACTIVE",
              },
              select: { id: true },
            });
            console.log(`Created employee: ${row.employeeName} (${employee.id})`);
          }

          // Create salary entry
          const salary = await prisma.salary.create({
            data: {
              employeeId: employee.id,
              employeeName: row.employeeName,
              amount: row.amount,
              adjustment: row.adjustment || null,
              adjustmentNote: row.adjustmentNote || null,
              date: salaryDate,
              month: row.month || null,
              payPeriod: payPeriod || null,
              notes: row.notes || null,
              createdById: null,
            },
          });

          // Create journal entry for salary expense
          const totalAmount = row.amount + (row.adjustment || 0);
          if (totalAmount > 0) {
            await prisma.journalEntry.create({
              data: {
                entityId,
                date: salaryDate,
                description: `${row.employeeName} - ${row.month || "Salary"}${row.adjustmentNote ? ` (${row.adjustmentNote})` : ""}`,
                status: "FINALIZED",
                category: "Admin Salary",
                createdById: null,
                createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER" | "ENTRY_MANAGER",
                importBatch: importBatchId,
                lines: {
                  create: [
                    {
                      accountId: opexAccount.id,
                      entryType: TxnType.DEBIT,
                      amount: totalAmount,
                      currency: "BDT",
                      entityId,
                    },
                  ],
                },
              },
            });
          }

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
        console.log(`Progress: ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
      }
    }

    console.log(`Successfully created ${created}/${rows.length} salary entries`);

    return NextResponse.json({
      success: true,
      data: {
        created,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Salary import error:", err);
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 }
    );
  }
}
