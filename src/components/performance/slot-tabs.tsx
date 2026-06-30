'use client';

import { useState } from 'react';
import { ClipboardList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon components can't be passed from a Server Component as props, so callers
// pass a name and we resolve it to a component here (in the client boundary).
const ICONS = {
  clipboard: ClipboardList,
  users: Users,
} as const;

export type SlotTabIcon = keyof typeof ICONS;

export interface SlotTab {
  key: string;
  label: string;
  icon?: SlotTabIcon;
  count?: number;
  accent?: 'blue' | 'purple';
  content: React.ReactNode;
}

/**
 * Generic segmented-control toggle that switches between pre-rendered slots.
 * Tabs whose `content` is null/undefined are hidden; if only one tab remains
 * the toggle bar is omitted and the content shows directly.
 */
export function SlotTabs({
  tabs,
  defaultKey,
}: {
  tabs: SlotTab[];
  defaultKey?: string;
}) {
  const visible = tabs.filter((t) => t.content != null && t.content !== false);
  const [key, setKey] = useState<string>(defaultKey ?? visible[0]?.key ?? '');

  if (visible.length === 0) return null;
  const active = visible.find((t) => t.key === key) ?? visible[0];

  return (
    <div className="space-y-4">
      {visible.length > 1 && (
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {visible.map((t) => (
            <TabBtn
              key={t.key}
              active={active.key === t.key}
              icon={t.icon}
              label={t.label}
              count={t.count ?? 0}
              accent={t.accent ?? 'blue'}
              onClick={() => setKey(t.key)}
            />
          ))}
        </div>
      )}
      {active.content}
    </div>
  );
}

function TabBtn({
  active,
  icon,
  label,
  count = 0,
  onClick,
  accent = 'blue',
}: {
  active: boolean;
  icon?: SlotTabIcon;
  label: string;
  count?: number;
  onClick: () => void;
  accent?: 'blue' | 'purple';
}) {
  const Icon = icon ? ICONS[icon] : null;
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
      {Icon && <Icon className="h-4 w-4" />}
      {label}

      {count > 0 && (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
