import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBasicAccounts } from "@/lib/accounts";
import { TxnType } from "@prisma/client";
import { z } from "zod";

const CreatePaymentSchema = z.object({
  amount: z.number().gt(0),
  currency: z.enum(["USD", "BDT"]).default("BDT"),
  paymentDate: z.string(),
  source: z.enum(["bank", "cash"]),
  note: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["ADMIN", "ACCOUNTS_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = CreatePaymentSchema.parse(body);
    const { id: investmentId } = await params;

    // Get investment to verify it exists
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      select: { id: true, entityId: true, name: true },
    });

    if (!investment) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    // Ensure accounts exist
    const accounts = await ensureBasicAccounts(investment.entityId);

    // Create journal entry
    const paymentDate = new Date(data.paymentDate);
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }

    const creditAccount = data.source === "bank" ? accounts.cash : accounts.pettyCash;

    const journalEntry = await prisma.journalEntry.create({
      data: {
        entityId: investment.entityId,
        date: paymentDate,
        description: `Investment Payment: ${investment.name}`,
        status: "FINALIZED",
        category: "Investment Payment",
        createdByRole: session.role as "ADMIN" | "ACCOUNTS_MANAGER",
        createdById: session.id,
        lines: {
          create: [
            {
              accountId: accounts.investments.id,
              pfAccount: null,
              entryType: TxnType.DEBIT,
              amount: data.amount,
              currency: data.currency as any,
              entityId: investment.entityId,
              memo: `Investment: ${investment.name}${data.note ? ` - ${data.note}` : ""}`,
            },
            {
              accountId: creditAccount.id,
              pfAccount: null,
              entryType: TxnType.CREDIT,
              amount: data.amount,
              currency: data.currency as any,
              entityId: investment.entityId,
              memo: `Payment for investment: ${investment.name}`,
            },
          ],
        },
      },
    });

    // Create payment record
    const payment = await prisma.investmentPayment.create({
      data: {
        investmentId,
        entityId: investment.entityId,
        amount: data.amount,
        currency: data.currency as any,
        paymentDate,
        source: data.source,
        note: data.note,
        journalEntryId: journalEntry.id,
      },
    });

    // Update investment status if all payments suggest fully paid (optional logic)

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        amount: data.amount,
        paymentDate: paymentDate.toISOString().split("T")[0],
        journalEntryId: journalEntry.id,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error("Payment creation error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
