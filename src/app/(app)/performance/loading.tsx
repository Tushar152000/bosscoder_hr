import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

export default function PerformanceLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <section className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-3 w-44" />
              </CardHeader>
              <CardBody className="flex justify-between">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-8 w-20" />
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Card>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-default px-5 py-3 last:border-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
