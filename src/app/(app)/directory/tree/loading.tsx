import { Skeleton } from '@/components/ui/skeleton';

export default function OrgTreeLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <div className="w-full px-4 md:px-10 py-6 space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-2" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-2" />
          <Skeleton className="h-3.5 w-16" />
        </div>

        {/* Title + toolbar */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <Skeleton className="h-6 w-28 mb-1.5" />
            <Skeleton className="h-3.5 w-60" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="hidden md:block h-9 w-60 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-9 md:w-28 rounded-lg" />
          </div>
        </div>

        {/* Department chips */}
        <div className="flex gap-1.5 overflow-hidden">
          {[120, 92, 104, 84, 96, 88, 76].map((w, i) => (
            <Skeleton key={i} className="h-8 shrink-0 rounded-full" style={{ width: w }} />
          ))}
        </div>

        {/* Chart: founder over a row of managers */}
        <div className="h-[560px] md:h-[620px] lg:h-[700px] rounded-xl border border-[#E2E8F0] bg-white pt-20">
          <div className="flex flex-col items-center gap-12">
            <Skeleton className="h-14 w-60 rounded-[10px]" />
            <div className="flex gap-4 overflow-hidden px-4">
              {[0, 1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-14 w-48 shrink-0 rounded-[10px]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
