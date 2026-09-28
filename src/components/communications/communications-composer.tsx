'use client';

import { useState, useMemo } from 'react';
import { Mail, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DepartmentSelector } from './department-selector';
import { BroadcastComposer } from './broadcast-composer';
import { FeatureLaunchComposer } from './feature-launch-composer';

interface Department { name: string; count: number }

interface Props {
  departments: Department[];
  employeesByDept: Record<string, { email: string; displayName: string }[]>;
  senderName: string;
}

type Tab = 'broadcast' | 'feature';

export function CommunicationsComposer({ departments, employeesByDept, senderName }: Props) {
  const [tab, setTab] = useState<Tab>('broadcast');
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    const list: { email: string; displayName: string }[] = [];
    for (const dept of selectedDepts) {
      for (const emp of employeesByDept[dept] ?? []) {
        if (!seen.has(emp.email)) { seen.add(emp.email); list.push(emp); }
      }
    }
    return list;
  }, [selectedDepts, employeesByDept]);

  function toggleDept(dept: string) {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept); else next.add(dept);
      return next;
    });
  }

  function toggleAll() {
    setSelectedDepts((prev) =>
      prev.size === departments.length ? new Set() : new Set(departments.map((d) => d.name)),
    );
  }

  const clearSelection = () => setSelectedDepts(new Set());

  const TABS: { key: Tab; label: string; icon: typeof Mail }[] = [
    { key: 'broadcast', label: 'Broadcast', icon: Mail },
    { key: 'feature', label: 'Feature launch', icon: Rocket },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr] pb-6">
      <DepartmentSelector
        departments={departments}
        selectedDepts={selectedDepts}
        recipientsCount={recipients.length}
        onToggle={toggleDept}
        onToggleAll={toggleAll}
      />

      <div className="flex flex-col gap-3">
        {/* Tab toggle */}
        <div className="inline-flex self-start rounded-lg border border-[#E2E8F0] bg-white p-0.5 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition',
                tab === key ? 'bg-[#0C447C] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'broadcast' ? (
          <BroadcastComposer
            recipients={recipients}
            selectedDeptCount={selectedDepts.size}
            senderName={senderName}
            onSent={clearSelection}
          />
        ) : (
          <FeatureLaunchComposer
            recipients={recipients}
            selectedDeptCount={selectedDepts.size}
            senderName={senderName}
            onSent={clearSelection}
          />
        )}
      </div>
    </div>
  );
}
