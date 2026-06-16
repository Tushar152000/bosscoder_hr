import { Skeleton } from '@/components/ui/skeleton';

export default function RolesLoading() {
  return (
    <div className="px-6 md:px-10 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-14" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <Skeleton className="h-6 w-52 mb-2" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-6 w-52 rounded-md" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-md p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Skeleton className="h-5 w-5 rounded-[5px]" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-5 w-6" />
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <Skeleton className="h-4 w-24 mb-1.5" />
            <Skeleton className="h-2.5 w-60" />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[1.7fr_1.4fr_0.5fr_0.8fr_0.3fr] gap-2.5 px-4 py-2.5 bg-[#F4F7FA] border-b border-slate-100">
          {['w-8', 'w-10', 'w-12', 'w-16', 'w-4'].map((w, i) => (
            <Skeleton key={i} className={`h-2.5 ${w}`} />
          ))}
        </div>

        {/* Row skeletons */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="hidden md:grid grid-cols-[1.7fr_1.4fr_0.5fr_0.8fr_0.3fr] gap-2.5 px-4 py-3 items-center border-b border-slate-100 last:border-0"
            style={{ opacity: 1 - i * 0.08 }}
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div>
                <Skeleton className="h-3 w-28 mb-1" />
                <Skeleton className="h-2.5 w-36" />
              </div>
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-4 w-14 rounded-full" />
              {i % 3 === 0 && <Skeleton className="h-4 w-10 rounded-full" />}
            </div>
            <Skeleton className="h-3 w-6" />
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            <Skeleton className="h-3.5 w-3.5 justify-self-end" />
          </div>
        ))}

        {/* Mobile skeletons */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="md:hidden flex flex-col gap-2 px-4 py-3 border-b border-slate-100 last:border-0"
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <div className="flex gap-1 pl-9">
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <div className="flex justify-between pl-9">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3.5 w-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
