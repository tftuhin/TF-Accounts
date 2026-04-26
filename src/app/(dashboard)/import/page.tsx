import { getSession } from "@/lib/auth";

export default async function ImportPage() {
  const session = await getSession();
  if (!session) return null;

  const requiredHeaders = ["Date", "Description", "Amount", "Category", "Sub-brand"];

  return (
    <div className="max-w-3xl animate-fade-in">
      <h1 className="text-2xl font-display text-ink-white mb-2">Bulk CSV Import</h1>
      <p className="text-sm text-ink-muted mb-6">
        Required columns: {requiredHeaders.join(", ")}
      </p>

      <div className="card p-8 text-center mb-6">
        <div className="text-3xl mb-3">⬆</div>
        <div className="text-sm text-ink-secondary mb-1">Drop CSV file here</div>
        <div className="text-2xs text-ink-faint">Column headers will be validated automatically</div>
        <input type="file" accept=".csv" className="hidden" id="csv-upload" />
        <label htmlFor="csv-upload" className="btn-primary mt-4 inline-flex cursor-pointer">Browse Files</label>
      </div>

      <div className="card p-5">
        <div className="text-sm font-semibold text-ink-white mb-3">Expected Format</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-header">
                {requiredHeaders.map((h) => <th key={h} className="table-cell text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="table-cell font-mono text-ink-secondary">2025-04-01</td>
                <td className="table-cell text-ink-primary">Theme Sale - Pro</td>
                <td className="table-cell font-mono text-accent-green">149.00</td>
                <td className="table-cell text-ink-secondary">Theme Sales</td>
                <td className="table-cell text-ink-secondary">Themefisher</td>
              </tr>
              <tr className="table-row">
                <td className="table-cell font-mono text-ink-secondary">2025-04-03</td>
                <td className="table-cell text-ink-primary">Hosting Bill</td>
                <td className="table-cell font-mono text-accent-red">-48.00</td>
                <td className="table-cell text-ink-secondary">Hosting</td>
                <td className="table-cell text-ink-secondary">Teamosis</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
