import { Skeleton } from '@/components/ui/skeleton';

function SectionSkeleton({ fields, cols = 2 }: { fields: number; cols?: number }) {
  return (
    <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <Skeleton className="w-[30px] h-[30px] rounded-[8px] shrink-0" />
        <div>
          <Skeleton className="h-3.5 w-24 mb-1" />
          <Skeleton className="h-2.5 w-40" />
        </div>
      </div>
      <div className={`px-5 py-5 grid grid-cols-1 ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EditEmployeeLoading() {
  return (
    <div className="px-6 md:px-10 py-5 space-y-5 pb-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3 w-3 rounded" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-8" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-full shrink-0" />
          <div>
            <Skeleton className="h-5 w-40 mb-1.5" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Form sections */}
      <SectionSkeleton fields={6} cols={2} />
      <SectionSkeleton fields={6} cols={2} />
      <SectionSkeleton fields={3} cols={3} />
      <SectionSkeleton fields={3} cols={3} />
    </div>
  );
}
