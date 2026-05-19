import { Skeleton } from '@/components/ui/skeleton';

export default function EditUserRolesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-2" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* User header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        {/* Main column */}
        <div className="flex flex-col gap-2.5">
          {/* Roles card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-3.5">
              <Skeleton className="h-6 w-6 rounded-md" />
              <div>
                <Skeleton className="h-3.5 w-12 mb-1" />
                <Skeleton className="h-2.5 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-md px-3 py-2.5 flex items-start gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded-[3px] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-6 rounded-md" />
                <div>
                  <Skeleton className="h-3.5 w-20 mb-1" />
                  <Skeleton className="h-2.5 w-56" />
                </div>
              </div>
              <Skeleton className="h-7 w-32 rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-md px-3 py-2 flex items-start gap-2.5">
                  <Skeleton className="h-3.5 w-3.5 rounded-[3px] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-2.5 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-2.5">
          {/* Effective access */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <Skeleton className="h-2.5 w-28 mb-2" />
            <div className="flex items-baseline gap-1.5 mb-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-[3px] w-full rounded-full mb-2.5" />
          </div>

          {/* Danger zone */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <Skeleton className="h-3.5 w-24 mb-1" />
            <Skeleton className="h-2.5 w-full mb-3" />
            <div className="flex flex-col gap-2.5">
              <div>
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-2.5 w-full mb-2" />
                <Skeleton className="h-7 w-full rounded-lg" />
              </div>
              <div className="pt-2.5 border-t border-slate-100">
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-2.5 w-full mb-2" />
                <Skeleton className="h-7 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <Skeleton className="h-2.5 w-16 mb-1.5" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
