import { Skeleton, SkeletonStack } from '@/components/ui/skeleton';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

export default function OrgTreeLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-3 w-72" />
        </CardHeader>
        <CardBody>
          <SkeletonStack count={8} itemClassName="h-9" />
        </CardBody>
      </Card>
    </div>
  );
}
