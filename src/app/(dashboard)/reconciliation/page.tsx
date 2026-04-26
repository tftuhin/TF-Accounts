import { getSession } from "@/lib/auth";

export default async function ReconciliationPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="max-w-3xl animate-fade-in">
      <h1 className="text-2xl font-display text-ink-white mb-2">Bank Reconciliation</h1>
      <p className="text-sm text-ink-muted mb-6">Upload bank statements (PDF/CSV) and match against ledger entries</p>

      <div className="card p-8 text-center mb-6">
        <div className="text-3xl mb-3">⬆</div>
        <div className="text-sm text-ink-secondary mb-1">Drop bank statement here (PDF or CSV)</div>
        <div className="text-2xs text-ink-faint">Supports: Stripe, PayPal, Wise, DBBL exports</div>
        <input type="file" accept=".csv,.pdf" className="hidden" id="bank-upload" />
        <label htmlFor="bank-upload" className="btn-primary mt-4 inline-flex cursor-pointer">Browse Files</label>
      </div>

      <div className="card p-10 text-center text-ink-faint text-sm">
        Upload a statement to begin matching transactions.
      </div>
    </div>
  );
}
