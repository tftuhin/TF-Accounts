export default function AssetsLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-28 rounded-lg shimmer" />
          <div className="h-4 w-44 rounded shimmer" />
        </div>
        <div className="h-9 w-28 rounded-lg shimmer" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-3 w-20 rounded shimmer" />
            <div className="h-6 w-28 rounded shimmer" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="card overflow-hidden">
        <div className="h-10 bg-surface-2 border-b border-surface-border px-4 flex items-center gap-4">
          {[120, 160, 80, 80, 80].map((w, i) => (
            <div key={i} className="h-3 rounded shimmer" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-border last:border-0">
            <div className="h-4 w-32 rounded shimmer" />
            <div className="h-4 w-40 rounded shimmer" />
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-5 w-16 rounded-full shimmer ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
