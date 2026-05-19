import { Skeleton } from '@/components/ui/skeleton';

export default function OrgTreeLoading() {
  return (
    <div className="py-5 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3 w-3 rounded" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Page title */}
      <div>
        <Skeleton className="h-6 w-32 mb-1.5" />
        <Skeleton className="h-3.5 w-56" />
      </div>

      {/* Tree card */}
      <div className="bg-white border border-slate-200/70 rounded-xl p-5">
        <Skeleton className="h-4 w-44 mb-1" />
        <Skeleton className="h-3 w-64 mb-5" />
        <div className="space-y-2.5">
          {[0, 0, 20, 20, 40, 20, 0, 20].map((indent, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5"
              style={{ paddingLeft: `${indent}px`, opacity: 1 - i * 0.06 }}
            >
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
  );
}
