export default function FundTransfersLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="h-7 w-36 rounded-lg shimmer" />
        <div className="h-4 w-52 rounded shimmer" />
      </div>
      {/* Form */}
      <div className="card p-5 space-y-4">
        <div className="h-4 w-28 rounded shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded shimmer" />
              <div className="h-9 w-full rounded-lg shimmer" />
            </div>
          ))}
        </div>
        <div className="h-9 w-28 rounded-lg shimmer" />
      </div>
      {/* Table */}
      <div className="card overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-border last:border-0">
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-4 w-32 rounded shimmer" />
            <div className="h-4 flex-1 rounded shimmer" />
            <div className="h-4 w-24 rounded shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
