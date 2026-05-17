import { Skeleton, SkeletonStack } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function DirectoryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1 min-w-[240px]" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-20" />
      </div>
      <Card>
        <SkeletonStack count={6} className="p-2" itemClassName="h-12" />
      </Card>
    </div>
  );
}
