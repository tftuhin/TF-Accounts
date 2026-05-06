import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBasicAccounts } from "@/lib/accounts";
import { TxnType } from "@prisma/client";

interface InvestmentPaymentRow {
  name: string;
  category: string;
  paymentDate: string;
  amount: number;
  currency?: string;
  source: string;
  note?: string;
}

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

function parseCSV(content: string): InvestmentPaymentRow[] {
  const lines = content.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const headers = lines[0].split(delimiter).map(parseValue);
  const rows: InvestmentPaymentRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(parseValue);
    const row: any = {};

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase();
      row[normalizedHeader] = values[index] || "";
    });

    if (!row.name || !row.category || !row.paymentdate || !row.amount || !row.source) {
      continue;
    }

    const amount = parseFloat(row.amount.toString());
    if (isNaN(amount) || amount <= 0) {
      continue;
    }

    rows.push({
      name: row.name,
      category: row.category.toString().toUpperCase(),
      paymentDate: row.paymentdate,
      amount,
      currency: (row.currency || "BDT").toString().toUpperCase(),
      source: row.source.toLowerCase(),
      note: row.note || undefined,
    });
  }

  return rows;
}

function parseJSON(content: string): InvestmentPaymentRow[] {
  let data = JSON.parse(content);
  const entries = Array.isArray(data) ? data : data.entries || data.data || [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("JSON must contain an array of investment payment entries");
  }

  const rows: InvestmentPaymentRow[] = entries
    .map((entry) => ({
      name: entry.name || entry.Name,
      category: entry.category || entry.Category,
      paymentDate: entry.paymentDate || entry.PaymentDate,
      amount: entry.amount ? parseFloat(entry.amount.toString()) : 0,
      currency: entry.currency || entry.Currency || "BDT",
      source: entry.source || entry.Source,
      note: entry.note || entry.Note,
    }))
    .filter((row) => row.name && row.category && row.paymentDate && row.amount > 0 && row.source);

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

    console.log(`Starting investment import: ${file.name}, size: ${file.size} bytes`);
    const content = await file.text();

    let rows: InvestmentPaymentRow[];
    if (file.name.endsWith('.json')) {
      console.log(`JSON file detected, parsing...`);
      rows = parseJSON(content);
    } else {
      console.log(`CSV file detected, parsing...`);
      rows = parseCSV(content);
    }

    console.log(`Successfully parsed ${rows.length} rows`);

    if (rows.length === 0) {
      return NextResponse.json({ error: "File is empty or no valid rows" }, { status: 400 });
    }

    const errors: Array<{ row: number; error: string }> = [];
    let created = 0;

    const accounts = await ensureBasicAccounts(entityId);
    const importBatchId = `import-investments-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Group by investment name to create/upsert investments
    const investmentMap = new Map<string, InvestmentPaymentRow[]>();
    rows.forEach((row) => {
      if (!investmentMap.has(row.name)) {
        investmentMap.set(row.name, []);
      }
      investmentMap.get(row.name)!.push(row);
    });

    // Process each unique investment
    const batchSize = 30;
    let rowIndex = 2;

    for (const [investmentName, payments] of investmentMap.entries()) {
      // Create or get investment
      const investment = await prisma.investment.upsert({
        where: { entityId_name: { entityId, name: investmentName } },
        update: {},
        create: {
          entityId,
          name: investmentName,
          category: payments[0]!.category.toUpperCase() as any,
          createdById: session.id,
        },
      });

      // Add all payments for this investment
      const paymentBatches = [];
      for (let i = 0; i < payments.length; i += batchSize) {
        paymentBatches.push(payments.slice(i, i + batchSize));
      }

      for (const paymentBatch of paymentBatches) {
        const promises = paymentBatch.map(async (payment, batchIdx) => {
          try {
            const paymentDate = new Date(payment.paymentDate);
            if (isNaN(paymentDate.getTime())) {
              errors.push({ row: rowIndex + batchIdx, error: `Invalid payment date: ${payment.paymentDate}` });
              return false;
            }

            const creditAccount = payment.source === "bank" ? accounts.cash : accounts.pettyCash;

            const journalEntry = await prisma.journalEntry.create({
              data: {
                entityId,
                date: paymentDate,
                description: `Investment Payment: ${investmentName}`,
                status: "FINALIZED",
                category: "Investment Payment",
                createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER",
                createdById: session.id,
                importBatch: importBatchId,
                lines: {
                  create: [
                    {
                      accountId: accounts.investments.id,
                      pfAccount: null,
                      entryType: TxnType.DEBIT,
                      amount: payment.amount,
                      currency: payment.currency as any,
                      entityId,
                      memo: `Investment: ${investmentName}${payment.note ? ` - ${payment.note}` : ""}`,
                    },
                    {
                      accountId: creditAccount.id,
                      pfAccount: null,
                      entryType: TxnType.CREDIT,
                      amount: payment.amount,
                      currency: payment.currency as any,
                      entityId,
                      memo: `Payment for investment: ${investmentName}`,
                    },
                  ],
                },
              },
            });

            await prisma.investmentPayment.create({
              data: {
                investmentId: investment.id,
                entityId,
                amount: payment.amount,
                currency: payment.currency as any,
                paymentDate,
                source: payment.source,
                note: payment.note,
                journalEntryId: journalEntry.id,
                importBatch: importBatchId,
              },
            });

            return true;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to create payment";
            console.error(`Row ${rowIndex + batchIdx} error:`, err);
            errors.push({ row: rowIndex + batchIdx, error: msg });
            return false;
          }
        });

        const results = await Promise.all(promises);
        created += results.filter(r => r).length;
        rowIndex += paymentBatch.length;
      }
    }

    console.log(`Successfully created ${created}/${rows.length} investment payments`);

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
    console.error("Investment import error:", err);
    return NextResponse.json(
      { error: msg, success: false },
      { status: 500 }
    );
  }
}
