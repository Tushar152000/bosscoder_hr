import { Skeleton } from '@/components/ui/skeleton';

export default function AttendanceLoading() {
  return (
    <div className="px-4 pb-8 md:px-10">
      {/* Header — greeting on the left, action on the right (stacked on mobile) */}
      <div className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-full max-w-64" />
          <Skeleton className="h-4 w-full max-w-72" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg md:w-64" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        {/* Calendar */}
        <div className="min-w-0 space-y-4 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="mx-auto h-4 w-6" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 7 }).map((_, col) => (
                <Skeleton key={col} className="mx-auto h-8 w-8 rounded-full sm:h-10 sm:w-10" />
              ))}
            </div>
          ))}
          <div className="flex flex-wrap gap-4 border-t border-zinc-100 pt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-16" />
            ))}
          </div>
        </div>

        {/* Leave balance + requests */}
        <div className="space-y-4">
          <div className="space-y-4 rounded-[10px] border border-zinc-200 bg-white p-4">
            <Skeleton className="h-3 w-28" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-[10px] border border-zinc-200 bg-white p-4">
            <Skeleton className="h-3 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
