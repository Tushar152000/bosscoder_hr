'use client';

import { useState } from 'react';
import { ChevronDown, Code, TrendingUp, Briefcase, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManagerGroup } from './manager-group';
import type { DirectoryDept } from '@/types/directory';
import type { LucideIcon } from 'lucide-react';

interface DeptConfig {
  bg: string;
  color: string;
  Icon: LucideIcon;
}

const DEPT_CONFIG: Record<string, DeptConfig> = {
  engineering: { bg: '#E6F1FB', color: '#0C447C', Icon: Code },
  tech: { bg: '#E6F1FB', color: '#0C447C', Icon: Code },
  growth: { bg: '#E1F5EE', color: '#0F6E56', Icon: TrendingUp },
  marketing: { bg: '#E1F5EE', color: '#0F6E56', Icon: TrendingUp },
  sales: { bg: '#EEEDFE', color: '#534AB7', Icon: Briefcase },
  operations: { bg: '#FAECE7', color: '#993C1D', Icon: Settings },
  ops: { bg: '#FAECE7', color: '#993C1D', Icon: Settings },
};

const DEFAULT_CONFIG: DeptConfig = { bg: '#F1EFE8', color: '#5F5E5A', Icon: Users };

function getDeptConfig(name: string): DeptConfig {
  const key = name.toLowerCase().split(/[\s-_]/)[0];
  return DEPT_CONFIG[key] ?? DEFAULT_CONFIG;
}

export function DepartmentGroup({ dept }: { dept: DirectoryDept }) {
  const [expanded, setExpanded] = useState(true);
  const { bg, color, Icon } = getDeptConfig(dept.name);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: bg }}
        >
          <Icon size={14} color={color} />
        </div>
        <span className="text-[14px] font-medium text-slate-900">{dept.name}</span>
        <span className="text-[11px] text-slate-600 bg-white border border-slate-200/70 px-2 py-0.5 rounded-full whitespace-nowrap">
          {dept.memberCount} {dept.memberCount === 1 ? 'member' : 'members'}
        </span>
        <div className="flex-1 h-px bg-slate-200/70 min-w-0" />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded-md hover:bg-slate-100 transition shrink-0"
          aria-label={expanded ? 'Collapse department' : 'Expand department'}
        >
          <ChevronDown
            size={14}
            className={cn('text-slate-600 transition-transform duration-200', expanded && 'rotate-180')}
          />
        </button>
      </div>

      {/* Manager + report rows */}
      {expanded && dept.managers.length > 0 && (
        <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
          {dept.managers.map((mgr, i) => (
            <div key={mgr.user.id} className={cn(i > 0 && 'border-t border-slate-200/70')}>
              <ManagerGroup manager={mgr} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
