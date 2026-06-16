import { Skeleton } from '@/components/ui/skeleton';

export default function PerformanceLoading() {
  return (
    <div className="px-6 md:px-10 py-6 space-y-10">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* My Queue */}
      <section className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex items-center gap-1 pt-2">
          {[72, 96, 80, 64].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
          ))}
        </div>
        {/* Form cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3.5 w-3.5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Browse employees */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-8 w-44 rounded-lg sm:block" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                {i % 3 === 0 && <Skeleton className="h-5 w-16 rounded-full" />}
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cycles table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
        {/* Table header */}
        <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_130px_90px] items-center gap-4 border-b border-slate-100 px-5 py-3">
            {[null, 'w-20', 'w-24', 'w-16'].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w ?? 'w-32'}`} />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_120px_130px_90px] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-1.5 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3.5 w-3.5 justify-self-end rounded" />
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
