export function DashboardSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-5">
      <div className="mbg-card h-16" />
      <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mbg-card h-[110px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="mbg-card h-64" />
        <div className="mbg-card h-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="mbg-card h-56" />
        <div className="mbg-card h-56" />
        <div className="mbg-card h-56" />
      </div>
    </div>
  );
}