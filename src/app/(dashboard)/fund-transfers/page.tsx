import { getSession } from "@/lib/auth";
import { getActiveBankAccounts, getFundTransfersList } from "@/lib/queries";
import { FundTransferClient } from "./fund-transfer-client";

export default async function FundTransfersPage() {
  const session = await getSession();
  if (!session) return null;

  const [bankAccounts, recentTransfers] = await Promise.all([
    getActiveBankAccounts(),
    getFundTransfersList(),
  ]);

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
        date: t.date.split("T")[0],
        fromAccount: t.fromAccount.accountName,
        fromType: t.fromAccount.accountType,
        toAccount: t.toAccount.accountName,
        toType: t.toAccount.accountType,
        amountFrom: t.amountFrom,
        currencyFrom: t.currencyFrom,
        amountTo: t.amountTo,
        currencyTo: t.currencyTo,
        exchangeRate: t.exchangeRate,
        entityName: t.entityName,
        reference: t.reference,
        createdBy: "Transfer",
      }))}
    />
  );
}
