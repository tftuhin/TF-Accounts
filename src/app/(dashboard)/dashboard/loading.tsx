export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg shimmer" />
          <div className="h-4 w-32 rounded shimmer" />
        </div>
        <div className="h-9 w-56 rounded-lg shimmer" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-8 w-32 rounded shimmer" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[0,1,2,3].map((i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="h-4 w-24 rounded shimmer" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-3 w-full rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5 h-[320px] shimmer" />
    </div>
  );
}
