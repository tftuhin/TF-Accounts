export default function IncomeLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="h-7 w-28 rounded-lg shimmer" />
        <div className="h-4 w-44 rounded shimmer" />
      </div>
      {/* Form card */}
      <div className="card p-5 space-y-4">
        <div className="h-4 w-24 rounded shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded shimmer" />
              <div className="h-9 w-full rounded-lg shimmer" />
            </div>
          ))}
        </div>
        <div className="h-9 w-28 rounded-lg shimmer" />
      </div>
      {/* Recent entries */}
      <div className="card overflow-hidden">
        <div className="h-10 bg-surface-2 border-b border-surface-border px-4 flex items-center gap-4">
          {[80, 200, 80].map((w, i) => (
            <div key={i} className="h-3 rounded shimmer" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-border last:border-0">
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-4 flex-1 rounded shimmer" />
            <div className="h-4 w-24 rounded shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
