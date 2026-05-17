import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission } from '@/types/review';

export function YourSelfEvalCard({ submission }: { submission: ReviewSubmission }) {
  const final = submission.status === 'submitted' || submission.status === 'locked';
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your self-evaluation</CardTitle>
          <StatusBadge status={submission.status} />
        </div>
        <CardDescription>
          {final && submission.submittedAt
            ? `Submitted on ${formatDate(submission.submittedAt)} — view only.`
            : 'Reflect on the past month and share what mattered. Submission is final.'}
        </CardDescription>
      </CardHeader>
      <CardBody className="flex items-center justify-end">
        <Button asChild variant={final ? 'outline' : 'default'}>
          <Link href={`/performance/submissions/${submission.submissionId}`}>
            {final ? 'View my submission' : 'Fill self-evaluation'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardBody>
    </Card>
  );
}

function StatusBadge({ status }: { status: ReviewSubmission['status'] }) {
  if (status === 'submitted') return <Badge variant="success">Submitted</Badge>;
  if (status === 'in-progress') return <Badge variant="warning">In progress</Badge>;
  if (status === 'locked') return <Badge variant="muted">Locked</Badge>;
  return <Badge variant="default">Not started</Badge>;
}
