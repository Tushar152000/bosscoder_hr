'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, GripVertical, Loader2, Pencil } from 'lucide-react';
import { saveQuickCardOrderAction } from '@/app/(app)/home/actions';
import { cn } from '@/lib/utils';

export interface QuickAccessItem {
  /** Stable id stored in the saved order (e.g. "directory"). */
  key: string;
  /** Server-rendered card. */
  node: React.ReactNode;
}

interface Props {
  items: QuickAccessItem[];
  /** HR/founders can reorder; the saved order applies to everyone. */
  canEdit: boolean;
}

/**
 * Home "Quick access" grid. HR can switch to edit mode and drag cards (or use the
 * arrow buttons — native drag-and-drop doesn't work on touch screens) to set the
 * order every employee sees.
 */
export function QuickAccessGrid({ items, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.key));
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const byKey = new Map(items.map((i) => [i.key, i]));
  // While editing, render the working order; otherwise the server's order.
  const shown = editing
    ? order.map((k) => byKey.get(k)).filter((i): i is QuickAccessItem => !!i)
    : items;

  function startEdit() {
    setOrder(items.map((i) => i.key));
    setEditing(true);
  }

  function moveTo(key: string, targetIndex: number) {
    setOrder((prev) => {
      const from = prev.indexOf(key);
      if (from < 0 || targetIndex < 0 || targetIndex >= prev.length || from === targetIndex) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(targetIndex, 0, key);
      return next;
    });
  }

  function save() {
    startSave(async () => {
      const res = await saveQuickCardOrderAction(order);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Card order saved for everyone');
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold tracking-[1.4px] uppercase text-slate-400">Quick access</p>
        {canEdit &&
          (editing ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-[12px] text-slate-500 sm:inline">
                Drag cards to reorder · applies to everyone
              </span>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C447C] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0a3a6a] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Saving…' : 'Save order'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit order
            </button>
          ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {shown.map((item, index) =>
          editing ? (
            <div
              key={item.key}
              draggable
              onDragStart={(e) => {
                setDragKey(item.key);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragKey && dragKey !== item.key) moveTo(dragKey, index);
              }}
              onDragEnd={() => setDragKey(null)}
              className={cn(
                'flex cursor-grab flex-col rounded-2xl outline-dashed outline-2 outline-offset-4 outline-[#0C447C]/30 transition active:cursor-grabbing',
                dragKey === item.key && 'opacity-40',
              )}
            >
              {/* Card is inert while editing so clicks/drags don't navigate. */}
              <div className="pointer-events-none flex flex-1 select-none">{item.node}</div>
              {/* Edit controls sit below the card so they never cover its content. */}
              <div className="flex items-center justify-between px-2 pt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <GripVertical className="h-3.5 w-3.5" />
                  Drag to move
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    onClick={() => moveTo(item.key, index - 1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-900 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    onClick={() => moveTo(item.key, index + 1)}
                    disabled={index === shown.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-900 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div key={item.key} className="flex">{item.node}</div>
          ),
        )}
      </div>
    </section>
  );
}
