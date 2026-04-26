export const revalidate = 60;

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PettyCashClient } from "./petty-cash-client";

function calcBalances(entries: { txnType: string; amount: number | { toNumber(): number } }[]) {
  const sum = (type: string) =>
    entries
      .filter((e) => e.txnType === type)
      .reduce((s, e) => s + (typeof e.amount === "object" ? e.amount.toNumber() : Number(e.amount)), 0);

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

export default async function PettyCashPage() {
  const session = await getSession();
  if (!session) return null;

  const periods = await prisma.pettyCashPeriod.findMany({
    orderBy: { periodStart: "desc" },
    take: 2,
    include: {
      entity: { select: { name: true, slug: true } },
      entries: { orderBy: { date: "asc" } },
    },
  });

  if (!periods.length) {
    return <PettyCashClient data={null} userRole={session.role} />;
  }

  const current  = periods[0];
  const previous = periods[1] ?? null;

  const cur  = calcBalances(current.entries);
  const prev = previous ? calcBalances(previous.entries) : null;
  const prevClosing = prev ? prev.bankBalance + prev.handCash : 0;

  return (
    <PettyCashClient
      data={{
        period: {
          id:          current.id,
          entityId:    current.entityId,
          entityName:  current.entity.name,
          periodStart: current.periodStart.toISOString().split("T")[0],
          periodEnd:   current.periodEnd.toISOString().split("T")[0],
          isClosed:    current.isClosed,
        },
        balances: {
          bankBalance:      cur.bankBalance,
          handCash:         cur.handCash,
          currentBalance:   cur.bankBalance + cur.handCash,
          prevMonthClosing: prevClosing,
          monthlyInput:     cur.totalInput,
        },
        entries: current.entries.map((e) => ({
          id:          e.id,
          date:        e.date.toISOString().split("T")[0],
          description: e.description,
          amount:      typeof e.amount === "object" ? e.amount.toNumber() : Number(e.amount),
          txnType:     e.txnType,
          hasReceipt:  !!e.receiptUrl,
        })),
      }}
      userRole={session.role}
    />
  );
}
