import { Skeleton } from '@/components/ui/skeleton';

export default function AttendanceLoading() {
  return (
    <div className="px-4 md:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3.5 w-60" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Today banner */}
          <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>

          {/* Calendar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-5 rounded" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, col) => (
                  <Skeleton key={col} className="h-9 rounded-lg" />
                ))}
              </div>
            ))}
            <div className="flex gap-4 pt-1 border-t border-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3.5 w-16" />
              ))}
            </div>
          </div>

          {/* Apply Leave button */}
          <Skeleton className="h-9 w-28 rounded-xl" />

          {/* Table */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-80" />
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-3" />
                  ))}
                </div>
              </div>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="grid grid-cols-7 gap-2 px-4 py-3 border-b border-slate-100 last:border-0 items-center">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-6 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
            <Skeleton className="h-3 w-20" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center space-y-1">
                  <Skeleton className="h-7 w-8 mx-auto" />
                  <Skeleton className="h-2.5 w-12 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
