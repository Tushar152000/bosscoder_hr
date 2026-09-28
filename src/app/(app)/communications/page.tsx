import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { listEmployees } from '@/lib/firestore/employees';
import { CommunicationsComposer } from '@/components/communications/communications-composer';
import { Home, ChevronRight } from 'lucide-react';

export const metadata = { title: 'Communications · Bosscoder HR' };

export default async function CommunicationsPage() {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) redirect('/directory');

  const employees = await listEmployees({ status: 'active', limit: 500 });

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
        <div className="flex items-center gap-1.5 text-[13px] text-slate-400 font-medium mb-1.5">
          <Home size={14} />
          <Link href="/" className="hover:text-slate-600 transition md:text-[16px] text-[14px]">Home</Link>
          <ChevronRight size={12} />
          <span className="text-slate-900 md:text-[16px] text-[14px]">Communications</span>
        </div>
        <h1 className="text-[24px] font-semibold text-dark-blue">Communications</h1>
        <p className="mt-0.5 text-[15px] text-slate-500">
          Send broadcast emails or announce a feature launch — to employees by department.
        </p>
      </div>
      <CommunicationsComposer
        departments={departments}
        employeesByDept={employeesByDept}
        senderName={user.displayName ?? 'HR Team'}
      />
    </div>
  );
}
