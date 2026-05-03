import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PettyCashClient } from "./petty-cash-client";

function calcBalances(entries: { txnType: string; amount: number }[]) {
  const sum = (type: string) =>
    entries.filter((e) => e.txnType === type).reduce((s, e) => s + e.amount, 0);

  const topups        = sum("FLOAT_TOPUP");
  const atmWithdraw   = sum("ATM_WITHDRAWAL");
  const cardPayments  = sum("CARD_PAYMENT");
  const cashExpenses  = sum("CASH_EXPENSE");

  return {
    bankBalance:  topups - atmWithdraw - cardPayments,
    handCash:     atmWithdraw - cashExpenses,
    totalInput:   topups,
  };
}

interface ProcessedPeriodData {
  id: string;
  entityId: string;
  entityName: string;
  periodStart: string;
  periodEnd: string;
  isClosed: boolean;
  balances: {
    bankBalance: number;
    handCash: number;
    currentBalance: number;
    monthlyInput: number;
    prevMonthClosing: number;
  };
  entries: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    txnType: string;
    hasReceipt: boolean;
  }>;
}

export default async function PettyCashPage() {
  const session = await getSession();
  if (!session) return null;

  // Fetch all petty cash periods
  const allPeriods = await prisma.pettyCashPeriod.findMany({
    orderBy: { periodStart: "desc" },
    include: {
      entity: { select: { name: true } },
      entries: { orderBy: { date: "asc" } },
    },
  });

  if (!allPeriods.length) {
    return <PettyCashClient allPeriodsData={[]} userRole={session.role} />;
  }

  // Process all periods for client
  const processedPeriods: ProcessedPeriodData[] = allPeriods.map((period, index) => {
    const balances = calcBalances(
      period.entries.map((e) => ({
        txnType: e.txnType,
        amount: Number(e.amount),
      }))
    );

    // Get previous period's closing balance
    const previousPeriod = allPeriods[index + 1];
    let prevMonthClosing = 0;
    if (previousPeriod) {
      const prevBalances = calcBalances(
        previousPeriod.entries.map((e) => ({
          txnType: e.txnType,
          amount: Number(e.amount),
        }))
      );
      prevMonthClosing = prevBalances.bankBalance + prevBalances.handCash;
    }

    return {
      id: period.id,
      entityId: period.entityId,
      entityName: period.entity.name,
      periodStart: period.periodStart.toISOString().split("T")[0],
      periodEnd: period.periodEnd.toISOString().split("T")[0],
      isClosed: period.isClosed,
      balances: {
        bankBalance: balances.bankBalance,
        handCash: balances.handCash,
        currentBalance: balances.bankBalance + balances.handCash,
        monthlyInput: balances.totalInput,
        prevMonthClosing,
      },
      entries: period.entries.map((e) => ({
        id: e.id,
        date: e.date.toISOString().split("T")[0],
        description: e.description,
        amount: Number(e.amount),
        txnType: e.txnType,
        hasReceipt: !!e.receiptUrl,
      })),
    };
  });

  return <PettyCashClient allPeriodsData={processedPeriods} userRole={session.role} />;
}
