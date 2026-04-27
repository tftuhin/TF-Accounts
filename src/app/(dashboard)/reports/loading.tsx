export default function ReportsLoading() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <div className="h-7 w-28 rounded-lg shimmer" />
        <div className="h-4 w-48 rounded shimmer" />
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        <div className="h-10 w-40 rounded-lg shimmer" />
        <div className="h-10 w-36 rounded-lg shimmer" />
      </div>
      {/* Parameters card */}
      <div className="card p-4 space-y-3">
        <div className="h-3 w-36 rounded shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-12 rounded shimmer" />
              <div className="h-9 w-full rounded-lg shimmer" />
            </div>
          ))}
        </div>
      </div>
      {/* Placeholder */}
      <div className="card p-10 flex items-center justify-center">
        <div className="h-4 w-64 rounded shimmer" />
      </div>
    </div>
  );
}
