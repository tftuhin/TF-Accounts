export default function ExpensesLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="h-7 w-32 rounded-lg shimmer" />
        <div className="h-4 w-56 rounded shimmer" />
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        <div className="h-10 w-36 rounded-lg shimmer" />
        <div className="h-10 w-36 rounded-lg shimmer" />
      </div>
      {/* Form card */}
      <div className="card p-5 space-y-4">
        <div className="h-4 w-32 rounded shimmer" />
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
    </div>
  );
}
