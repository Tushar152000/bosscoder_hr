import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { getOrgTree } from './actions';
import { OrgChart } from '@/components/org-chart/OrgChart';

export const metadata = { title: 'Org Chart' };

const ALLOWED = new Set(['hr', 'founder', 'manager', 'admin']);

export default async function OrgChartPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.has(r))) redirect('/?error=forbidden');

  const people = await getOrgTree();

  return (
    <div style={{ height: 'calc(100vh - 3.5rem)', overflow: 'hidden' }}>
      <OrgChart people={people} />
    </div>
  );
}
