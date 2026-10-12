import { Skeleton } from '@/components/ui/skeleton';

/** Shimmer placeholder matching the Account page: header, Profile card, Documents list. */
export default function AccountLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb + title */}
      <div className="space-y-2">
        <Skeleton shimmer className="h-4 w-36" />
        <Skeleton shimmer className="h-6 w-28" />
        <Skeleton shimmer className="h-4 w-56" />
      </div>

      {/* Profile */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <Skeleton shimmer className="h-4 w-16" />
        </div>
        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-4">
            <Skeleton shimmer className="h-[72px] w-[72px] shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton shimmer className="h-4 w-24" />
              <Skeleton shimmer className="h-3 w-40" />
            </div>
            <div className="hidden space-y-2 sm:block">
              <Skeleton shimmer className="h-5 w-40" />
              <Skeleton shimmer className="h-4 w-56" />
            </div>
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-t border-slate-100 pt-4">
              <Skeleton shimmer className="h-4 w-24" />
              <Skeleton shimmer className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="space-y-2 border-b border-slate-100 px-5 py-4">
          <Skeleton shimmer className="h-4 w-24" />
          <Skeleton shimmer className="h-3 w-full max-w-md" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0">
            <Skeleton shimmer className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton shimmer className="h-4 w-32" />
              <Skeleton shimmer className="h-3 w-44" />
            </div>
            <Skeleton shimmer className="h-9 w-24 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
