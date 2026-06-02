'use client';

import { useState } from 'react';
import { ClipboardList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MyQueue } from './my-queue';
import { MyTeamRail, type ReportWithHistory } from './my-team-rail';
import type { ReviewCycle, ReviewSubmission } from '@/types/review';

type View = 'self' | 'manager';

interface Props {
  submissions: ReviewSubmission[];
  cyclesById: Record<string, ReviewCycle>;
  reportsWithHistory: ReportWithHistory[];
  mgrEvalByCycle: Record<string, ReviewSubmission>;
  prevRatingByCycle: Record<string, number | null>;
  selfEvalStatusById?: Record<string, string>;
}

export function EvalQueueSection({
  submissions,
  cyclesById,
  reportsWithHistory,
  mgrEvalByCycle,
  prevRatingByCycle,
  selfEvalStatusById = {},
}: Props) {
  const hasSelf    = submissions.some((s) => s.kind === 'self');
  const hasManager = submissions.some((s) => s.kind === 'manager');
  const hasReports = reportsWithHistory.length > 0;

  const [view, setView] = useState<View>(() =>
    hasManager || hasReports ? 'manager' : 'self',
  );


  const showToggle = (hasSelf && (hasManager || hasReports));

  return (
    <div className="space-y-4">
    
      {showToggle && (
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 ">
          <ToggleBtn
            active={view === 'self'}
            icon={ClipboardList}
            label="My evaluations"
            onClick={() => setView('self')}
          />
          <ToggleBtn
            active={view === 'manager'}
            icon={Users}
            label="Team evaluations"
            onClick={() => setView('manager')}
            accent="purple"
          />
        </div>
      )}


      {view === 'self' && hasSelf && (
        <MyQueue
          submissions={submissions}
          cyclesById={cyclesById}
          kind="self"
          mgrEvalByCycle={mgrEvalByCycle}
          prevRatingByCycle={prevRatingByCycle}
        />
      )}

      {view === 'manager' && (hasManager || hasReports) && (
        <div className={hasManager && hasReports ? 'grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3.5 items-start' : undefined}>
          {hasManager && (
            <MyQueue
              submissions={submissions}
              cyclesById={cyclesById}
              kind="manager"
              hasRail={hasReports}
              selfEvalStatusById={selfEvalStatusById}
            />
          )}
          {hasReports && <MyTeamRail reports={reportsWithHistory} />}
        </div>
      )}
    </div>
  );
}

function ToggleBtn({
  active,
  icon: Icon,
  label,
  onClick,
  accent = 'blue',
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
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
    </button>
  );
}
