'use client';

import { Fragment, useState } from 'react';
import { Building2, CalendarDays, ClipboardList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'cycles' | 'departments' | 'self' | 'manager';

interface Props {
  cycles: React.ReactNode;
  departments: React.ReactNode;
  myEvaluations: React.ReactNode | null;
  teamEvaluations: React.ReactNode | null;
  myOpenCount?: number;
  teamOpenCount?: number;
  defaultTab?: Tab;
}

/**
 * Top-level toggle for the admin performance landing page:
 * Evaluation cycles · Departments (the browse grid) · My evaluations · Team evaluations.
 * Each panel is passed in as a slot; tabs with no content are hidden.
 */
export function AdminPerformanceTabs({
  cycles,
  departments,
  myEvaluations,
  teamEvaluations,
  myOpenCount = 0,
  teamOpenCount = 0,
  defaultTab = 'cycles',
}: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const panel =
    tab === 'cycles'
      ? cycles
      : tab === 'departments'
      ? departments
      : tab === 'self'
      ? myEvaluations
      : teamEvaluations;

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
        <TabBtn
          active={tab === 'cycles'}
          icon={CalendarDays}
          label="Evaluation cycles"
          onClick={() => setTab('cycles')}
        />
        <TabBtn
          active={tab === 'departments'}
          icon={Building2}
          label="Departments"
          onClick={() => setTab('departments')}
        />
        {myEvaluations && (
          <TabBtn
            active={tab === 'self'}
            icon={ClipboardList}
            label="My evaluations"
            count={myOpenCount}
            onClick={() => setTab('self')}
          />
        )}
        {teamEvaluations && (
          <TabBtn
            active={tab === 'manager'}
            icon={Users}
            label="Team evaluations"
            count={teamOpenCount}
            accent="purple"
            onClick={() => setTab('manager')}
          />
        )}
      </div>

      <Fragment key={tab}>{panel}</Fragment>
    </div>
  );
}

function TabBtn({
  active,
  icon: Icon,
  label,
  count = 0,
  onClick,
  accent = 'blue',
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  count?: number;
  onClick: () => void;
  accent?: 'blue' | 'purple';
}) {
  const activeStyles =
    accent === 'purple'
      ? 'bg-white text-[#534AB7] shadow-sm'
      : 'bg-white text-[#0C447C] shadow-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all',
        active ? activeStyles : 'text-slate-500 hover:text-slate-700',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
