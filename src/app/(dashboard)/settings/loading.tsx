export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-7 w-28 rounded-lg shimmer" />
        <div className="h-4 w-48 rounded shimmer" />
      </div>
      {/* Entity cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg shimmer" />
              <div className="h-5 w-32 rounded shimmer" />
              <div className="h-5 w-16 rounded-full shimmer ml-auto" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-16 rounded-lg shimmer" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Team members */}
      <div className="card overflow-hidden">
        <div className="h-10 bg-surface-2 border-b border-surface-border px-5 flex items-center">
          <div className="h-3 w-28 rounded shimmer" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-surface-border last:border-0">
            <div className="h-8 w-8 rounded-full shimmer" />
            <div className="space-y-1 flex-1">
              <div className="h-4 w-36 rounded shimmer" />
              <div className="h-3 w-24 rounded shimmer" />
            </div>
            <div className="h-5 w-20 rounded-full shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
