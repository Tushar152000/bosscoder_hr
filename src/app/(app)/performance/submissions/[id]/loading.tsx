import { Skeleton } from '@/components/ui/skeleton';

export default function SubmissionLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">

      {/* Fixed top: breadcrumb + header */}
      <div className="flex-shrink-0 px-6 md:px-10 pt-5 pb-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-2.5 w-2" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-2" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-2" />
          <Skeleton className="h-3 w-28" />
        </div>
        {/* Header */}
        <div className="flex items-center gap-2.5 mt-1">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-1.5 h-3 w-52" />
      </div>

      {/* Body row */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden px-6 md:px-10">

  
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-2.5 py-3">

          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <Skeleton className="h-2.5 w-16 mb-2" />
            <div className="flex items-baseline gap-1 mb-1.5">
              <Skeleton className="h-6 w-5" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-[3px] w-full rounded-full mb-3" />

            <div className="flex flex-col gap-1 pt-2 border-t border-slate-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-1.5 py-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded-full flex-shrink-0" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>

          <div className="bg-[#FAEEDA] border border-[#FAC775] rounded-md p-2.5">
            <Skeleton className="h-2.5 w-20 bg-[#e8c99a] mb-1" />
            <Skeleton className="h-2.5 w-full bg-[#e8c99a]" />
          </div>
        </div>

        {/* Right — question card skeletons */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-4"
                style={{ opacity: 1 - i * 0.07 }}
              >
                <div className="flex items-start gap-2.5 mb-3">
                  <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1.5" />
                    <Skeleton className="h-3 w-3/4" />
                    {/* Pillar chips on Q3 */}
                    {i === 2 && (
                      <div className="flex gap-1.5 mt-2">
                        <Skeleton className="h-5 w-28 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-28 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
                <Skeleton className={i === 0 ? 'h-[130px] w-full' : 'h-[80px] w-full'} />
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="flex-shrink-0 px-6 md:px-10 py-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>

    </div>
  );
}
