import { Skeleton } from '@/components/ui/skeleton';

export default function EmployeeDetailLoading() {
  return (
    <div className="px-6 md:px-10 py-5 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3 w-3 rounded" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-28" />
      </div>

      {/* Header card */}
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-full shrink-0" />
            <div>
              <Skeleton className="h-5 w-40 mb-1.5" />
              <Skeleton className="h-3 w-52 mb-2" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-14 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        {/* Left column */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <Skeleton className="h-4 w-16 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-2.5 w-20 mb-1.5" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <div className="flex items-center gap-3 p-4 bg-[#FAFAF7] border border-slate-200/70 rounded-lg">
              <Skeleton className="h-4 w-4 rounded shrink-0" />
              <div>
                <Skeleton className="h-3 w-44 mb-1.5" />
                <Skeleton className="h-2.5 w-64" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/70 rounded-xl p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <div>
                    <Skeleton className="h-3 w-28 mb-1" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
