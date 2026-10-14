import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { listEmployees } from '@/lib/firestore/employees';
import { listCelebrationPeople, todayIST } from '@/lib/celebrations/people';
import { celebrationChannels } from '@/lib/slack';
import { CommunicationsComposer } from '@/components/communications/communications-composer';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export const metadata = { title: 'Communications · Bosscoder HR' };

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const user = await requireUser();
  if (!isPrivileged(user.roles)) redirect('/directory');

  const employees = await listEmployees({ status: 'active', limit: 500 });
  const [people, channels] = await Promise.all([listCelebrationPeople(employees), celebrationChannels()]);

  const deptMap = new Map<string, { email: string; displayName: string }[]>();
  for (const emp of employees) {
    if (!emp.email) continue;
    const dept = emp.department || 'Unassigned';
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    deptMap.get(dept)!.push({ email: emp.email, displayName: emp.displayName });
  }

  const DEPT_ORDER = ['Leadership'];
  const allDepts = [...deptMap.keys()];
  const sortedDepts = [
    ...DEPT_ORDER.filter((d) => allDepts.includes(d)),
    ...allDepts.filter((d) => !DEPT_ORDER.includes(d)).sort(),
  ];

  const departments = sortedDepts.map((name) => ({
    name,
    count: deptMap.get(name)!.length,
  }));

  const employeesByDept = Object.fromEntries(deptMap);

  return (
    <div className="w-full space-y-4 px-6 md:px-10 py-5">
      <div>
        <Breadcrumbs items={[{ label: 'Communications' }]} className="mb-1.5" />
        <h1 className="text-[24px] font-semibold text-dark-blue">Communications</h1>
        <p className="mt-0.5 text-[15px] text-slate-500">
          Send broadcast emails, announce a feature launch, or post birthday and anniversary wishes to Slack.
        </p>
      </div>
      <CommunicationsComposer
        departments={departments}
        employeesByDept={employeesByDept}
        senderName={user.displayName ?? 'HR Team'}
        initialTab={tab === 'celebrations' || tab === 'feature' ? tab : 'broadcast'}
        celebrations={{
          people,
          todayISO: todayIST(),
          channels: channels.map((c) => ({ target: c.target, name: c.name })),
        }}
      />
    </div>
  );
}
