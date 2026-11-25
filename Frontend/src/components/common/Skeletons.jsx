export function CardGridSkeleton({ count = 6, height = 140 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-[#11141B] border border-[#292F3B] p-4 space-y-3 animate-pulse"
        >
          <div
            className="w-full rounded-xl bg-[#191E28]"
            style={{ height: `${height}px` }}
          />
          <div className="h-4 w-3/4 bg-[#191E28] rounded-md" />
          <div className="h-3 w-1/2 bg-[#191E28] rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ count = 5, height = 64 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-[#11141B] border border-[#292F3B] p-4 flex items-center justify-between animate-pulse"
          style={{ minHeight: `${height}px` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#191E28]" />
            <div className="space-y-1.5">
              <div className="h-4 w-48 bg-[#191E28] rounded" />
              <div className="h-3 w-28 bg-[#191E28] rounded" />
            </div>
          </div>
          <div className="h-6 w-20 bg-[#191E28] rounded-full" />
        </div>
      ))}
    </div>
  );
}
