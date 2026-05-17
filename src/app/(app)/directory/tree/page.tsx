import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { getAllEmployeesForTree } from '@/lib/firestore/employees';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OrgTree, type TreeEmployee } from '@/components/employees/org-tree';

export const metadata = { title: 'Org tree' };

export default async function OrgTreePage() {
  await requireUser();
  const all = await getAllEmployeesForTree();
  const tree: TreeEmployee[] = all.map((e) => ({
    employeeId: e.employeeId,
    displayName: e.displayName,
    email: e.email,
    designation: e.designation,
    department: e.department,
    managerId: e.managerId,
    active: e.active,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/directory"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Org tree</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reporting structure</CardTitle>
          <CardDescription>
            Built from the manager field on each employee. Click a name to open their profile.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <OrgTree employees={tree} />
        </CardBody>
      </Card>
    </div>
  );
}
