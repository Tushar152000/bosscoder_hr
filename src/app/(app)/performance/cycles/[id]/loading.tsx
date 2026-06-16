import { Skeleton } from '@/components/ui/skeleton';

export default function CycleLoading() {
  return (
    <div className="px-6 md:px-10 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3 w-8 rounded" />
        <Skeleton className="h-2.5 w-2.5 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-2.5 w-2.5 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#E2E8F0] bg-white p-4"
          >
            <Skeleton className="mb-3 h-8 w-8 rounded-md" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="mt-1 h-3 w-16" />
            <Skeleton className="mt-0.5 h-2.5 w-24" />
            <Skeleton className="mt-3 h-1 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Self-eval card */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4 flex items-center gap-2.5 border-b border-[#E2E8F0] pb-3">
          <Skeleton className="h-7 w-7 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
          <Skeleton className="h-3.5 w-64" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Team section */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
