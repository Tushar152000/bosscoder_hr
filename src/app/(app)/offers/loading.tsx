import { Skeleton, SkeletonStack } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function OffersLoading() {
  return (
    <div className="offers-theme px-6 md:px-10 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <Card>
        <SkeletonStack count={5} className="p-2" itemClassName="h-12" />
      </Card>
    </div>
  );
}
