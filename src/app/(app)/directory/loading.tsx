function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-100 ${className ?? ''}`} />
  );
}

export default function DirectoryLoading() {
  return (
    <div className="px-6 md:px-10 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-3 w-40" />
          <Shimmer className="h-6 w-52" />
          <Shimmer className="h-3 w-64" />
        </div>
        <div className="flex gap-2 mt-1">
          <Shimmer className="h-8 w-24" />
          <Shimmer className="h-8 w-32" />
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <Shimmer className="h-9 flex-1 min-w-[220px]" />
        <Shimmer className="h-9 w-40" />
        <Shimmer className="h-9 w-32" />
      </div>

      {/* Department sections */}
      {[1, 2].map((d) => (
        <div key={d}>
          {/* Dept header row */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <Shimmer className="w-7 h-7 rounded-[7px]" />
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-5 w-16 rounded-full" />
            <div className="flex-1 h-px bg-slate-100" />
            <Shimmer className="w-5 h-5 rounded" />
          </div>

          {/* Card with manager + report rows */}
          <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
            {/* Manager row */}
            <div className="flex items-center gap-3 px-3.5 py-3 bg-[#FAFAF7] border-b border-slate-200/70">
              <Shimmer className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3 w-36" />
                <Shimmer className="h-2.5 w-52" />
              </div>
              <Shimmer className="h-3 w-16 hidden md:block" />
              <Shimmer className="h-5 w-14 rounded-full hidden md:block" />
              <Shimmer className="h-3 w-16 hidden md:block" />
            </div>
            {/* Report rows */}
            {[1, 2, 3].map((r) => (
              <div key={r} className="flex items-center gap-3 pl-10 pr-3.5 py-2.5 border-b border-slate-200/70 last:border-b-0">
                <Shimmer className="w-6 h-6 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Shimmer className="h-3 w-28" />
                  <Shimmer className="h-2 w-20" />
                </div>
                <Shimmer className="h-3 w-14 hidden md:block" />
                <Shimmer className="h-5 w-12 rounded-full hidden md:block" />
                <Shimmer className="h-3 w-16 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
