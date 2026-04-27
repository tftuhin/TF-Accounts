export default function JournalsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg shimmer" />
          <div className="h-4 w-48 rounded shimmer" />
        </div>
        <div className="h-8 w-28 rounded-lg shimmer" />
      </div>
      {/* Filter row */}
      <div className="card p-3 flex gap-3">
        {[120, 96, 96, 96, 80].map((w, i) => (
          <div key={i} className="h-9 rounded-lg shimmer" style={{ width: w }} />
        ))}
      </div>
      {/* Table */}
      <div className="card overflow-hidden">
        <div className="h-10 bg-surface-2 border-b border-surface-border px-4 flex items-center gap-4">
          {[80, 200, 100, 80, 60].map((w, i) => (
            <div key={i} className="h-3 rounded shimmer" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-border last:border-0">
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-4 w-48 rounded shimmer" />
            <div className="h-4 w-24 rounded shimmer" />
            <div className="h-4 w-16 rounded shimmer ml-auto" />
            <div className="h-5 w-14 rounded-full shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
