import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FundTransferClient } from "./fund-transfer-client";

export default async function FundTransfersPage() {
  const session = await getSession();
  if (!session) return null;

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { accountType: "asc" },
    include: { entity: { select: { name: true } } },
  });

  const recentTransfers = await prisma.fundTransfer.findMany({
    take: 20,
    orderBy: { date: "desc" },
    include: {
      fromAccount: { select: { accountName: true, accountType: true, currency: true } },
      toAccount: { select: { accountName: true, accountType: true, currency: true } },
      entity: { select: { name: true } },
      creator: { select: { fullName: true } },
    },
  });

  return (
    <FundTransferClient
      bankAccounts={bankAccounts.map((ba) => ({
        id: ba.id,
        accountName: ba.accountName,
        accountType: ba.accountType,
        currency: ba.currency,
        bankName: ba.bankName,
        entityName: ba.entity.name,
      }))}
      recentTransfers={recentTransfers.map((t) => ({
        id: t.id,
        date: t.date.toISOString().split("T")[0],
        fromAccount: t.fromAccount.accountName,
        fromType: t.fromAccount.accountType,
        toAccount: t.toAccount.accountName,
        toType: t.toAccount.accountType,
        amountFrom: Number(t.amountFrom),
        currencyFrom: t.currencyFrom,
        amountTo: Number(t.amountTo),
        currencyTo: t.currencyTo,
        exchangeRate: t.exchangeRate ? Number(t.exchangeRate) : null,
        entityName: t.entity.name,
        reference: t.reference,
        createdBy: t.creator.fullName,
      }))}
    />
  );
}
