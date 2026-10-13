'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowLeft, CheckCircle2, EyeOff, Inbox, Loader2, Search, X } from 'lucide-react';
import { updateHrFeedbackAction } from '@/app/(app)/hr-feedback/actions';
import { cn, initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { CopyButton } from '@/components/ui/copy-button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  HR_FEEDBACK_CATEGORIES,
  HR_FEEDBACK_STATUSES,
  RESPONSE_MAX,
  STATUS_LABEL,
  type HrFeedbackCategory,
  type HrFeedbackItem,
  type HrFeedbackStatus,
} from '@/lib/hr-feedback/types';

type Tab = HrFeedbackStatus | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'in-review', label: 'In review' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

const STATUS_DOT: Record<HrFeedbackStatus, string> = {
  new: 'bg-[#0C447C]',
  'in-review': 'bg-[#BA7517]',
  resolved: 'bg-[#1D9E75]',
};

const IST = 'Asia/Kolkata';

function whenShort(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  if (mins < 60 * 24 * 7) return `${Math.round(mins / 1440)}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST });
}

function whenLong(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: IST,
  });
}

function SenderAvatar({ item, size = 'sm' }: { item: HrFeedbackItem; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-11 w-11 text-[14px]' : 'h-8 w-8 text-[11px]';
  if (item.anonymous || !item.name) {
    return (
      <span className={cn(dim, 'grid shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500')}>
        <EyeOff className={size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
      </span>
    );
  }
  return (
    <span
      className={cn(dim, 'grid shrink-0 place-items-center rounded-full font-semibold text-white')}
      style={{ backgroundColor: colorForName(item.name) }}
    >
      {initials(item.name, item.email ?? '')}
    </span>
  );
}

function CategoryTag({ category }: { category: HrFeedbackCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[category] }} />
      {CATEGORY_LABEL[category]}
    </span>
  );
}

export function HrFeedbackInbox({ items }: { items: HrFeedbackItem[] }) {
  const [tab, setTab] = useState<Tab>(() => (items.some((i) => i.status === 'new') ? 'new' : 'all'));
  const [category, setCategory] = useState<HrFeedbackCategory | null>(null);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Phones show the list or the open message, not both.
  const [mobileDetail, setMobileDetail] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { new: 0, 'in-review': 0, resolved: 0, all: items.length };
    for (const i of items) c[i.status]++;
    return c;
  }, [items]);

  const categoryCounts = useMemo(() => {
    const c = new Map<HrFeedbackCategory, number>();
    for (const i of items) if (tab === 'all' || i.status === tab) c.set(i.category, (c.get(i.category) ?? 0) + 1);
    return c;
  }, [items, tab]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (tab !== 'all' && i.status !== tab) return false;
      if (category && i.category !== category) return false;
      if (!s) return true;
      return [i.message, i.name ?? '', i.email ?? '', i.department ?? '', i.response ?? '']
        .some((v) => v.toLowerCase().includes(s));
    });
  }, [items, tab, category, q]);

  // Keep a message open on desktop: the selected one if it's still listed, else the first.
  useEffect(() => {
    if (selectedId && visible.some((i) => i.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [visible, selectedId]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 md:px-10">
      <div className="space-y-1.5">
        <Breadcrumbs items={[{ label: 'Feedback to HR', href: '/hr-feedback' }, { label: 'HR inbox' }]} />
        <h1 className="text-[22px] font-semibold text-slate-900">HR inbox</h1>
        <p className="text-[13px] tabular-nums text-slate-500">
          {counts.new} new · {counts['in-review']} in review · {counts.resolved} resolved
          <span className="text-slate-400"> · visible to HR and founders only</span>
        </p>
      </div>

      {/* Status tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setCategory(null); }}
              aria-pressed={tab === t.key}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition',
                tab === t.key ? 'bg-[#0C447C] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums',
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages and senders"
            aria-label="Search feedback"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0C447C]/50 focus:ring-2 focus:ring-[#0C447C]/15 sm:text-[13px]"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Topic chips */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by topic">
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={cn(
            'inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12.5px] font-medium transition',
            category === null ? 'border-[#0C447C] bg-[#0C447C] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
          )}
        >
          All topics
        </button>
        {HR_FEEDBACK_CATEGORIES.filter((c) => categoryCounts.has(c) || category === c).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? null : c)}
            aria-pressed={category === c}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition',
              category === c ? 'border-[#B5D4F4] bg-[#EBF3FE] text-[#0C447C]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[c] }} />
            {CATEGORY_LABEL[c]}
            <span className="tabular-nums text-slate-400">{categoryCounts.get(c) ?? 0}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100">
            <Inbox className="h-5 w-5 text-slate-400" />
          </span>
          <p className="text-[14px] font-semibold text-slate-900">No feedback yet</p>
          <p className="max-w-sm text-[13px] text-slate-500">
            When someone sends feedback from the Feedback to HR page, it lands here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* List */}
          <div
            className={cn(
              'min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block',
              mobileDetail && 'hidden',
            )}
          >
            {visible.length === 0 ? (
              <div className="px-5 py-12 text-center text-[13px] text-slate-500">
                Nothing here{q.trim() ? ` matches “${q.trim()}”` : ''}.
                {(category || q) && (
                  <button
                    type="button"
                    onClick={() => { setCategory(null); setQ(''); }}
                    className="ml-1 font-semibold text-[#0C447C] underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <ul className="max-h-[calc(100vh-300px)] min-h-[360px] divide-y divide-slate-100 overflow-y-auto">
                {visible.map((i) => {
                  const on = i.id === selectedId;
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(i.id); setMobileDetail(true); }}
                        aria-current={on ? 'true' : undefined}
                        className={cn(
                          'relative flex w-full gap-3 px-4 py-3.5 text-left transition',
                          on ? 'bg-[#EBF3FE]' : 'hover:bg-slate-50',
                        )}
                      >
                        {on && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#0C447C]" />}
                        <SenderAvatar item={i} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={cn('truncate text-[13.5px] text-slate-900', i.status === 'new' ? 'font-semibold' : 'font-medium')}>
                              {i.anonymous ? 'Anonymous' : i.name}
                            </span>
                            <span className="ml-auto shrink-0 text-[11.5px] text-slate-400" suppressHydrationWarning>
                              {whenShort(i.createdAt)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <CategoryTag category={i.category} />
                            {tab === 'all' && (
                              <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-slate-500">
                                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[i.status])} />
                                {STATUS_LABEL[i.status]}
                              </span>
                            )}
                          </span>
                          <span className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-slate-500">{i.message}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div className={cn('min-w-0 lg:block', !mobileDetail && 'hidden')}>
            {selected ? (
              <FeedbackDetail key={selected.id} item={selected} onBack={() => setMobileDetail(false)} />
            ) : (
              <div className="hidden h-full min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-200 text-[13px] text-slate-500 lg:grid">
                Pick a message to read it.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackDetail({ item, onBack }: { item: HrFeedbackItem; onBack: () => void }) {
  const [status, setStatus] = useState<HrFeedbackStatus>(item.status);
  const [response, setResponse] = useState(item.response ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSave] = useTransition();

  const dirty = status !== item.status || response.trim() !== (item.response ?? '');
  const firstName = item.name?.split(' ')[0] ?? '';

  function save(nextStatus: HrFeedbackStatus = status) {
    setError(null);
    setSaved(false);
    startSave(async () => {
      const res = await updateHrFeedbackAction({ id: item.id, status: nextStatus, response });
      if (!res.ok) { setError(res.error); return; }
      setStatus(nextStatus);
      setSaved(true);
    });
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0C447C] lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> All messages
        </button>
        <div className="flex items-start gap-3">
          <SenderAvatar item={item} size="lg" />
          <div className="min-w-0 flex-1">
            {item.anonymous ? (
              <>
                <p className="text-[15px] font-semibold text-slate-900">Anonymous</p>
                <p className="text-[12.5px] text-slate-500">Sent without a name. There’s no way to reply.</p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-slate-900">{item.name}</p>
                <p className="truncate text-[12.5px] text-slate-500">
                  {[item.designation, item.department].filter(Boolean).join(' · ') || 'No role on file'}
                </p>
                {item.email && (
                  <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-slate-500">
                    <span className="truncate">{item.email}</span>
                    <CopyButton value={item.email} />
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <CategoryTag category={item.category} />
          <span className="text-[12px] text-slate-400" suppressHydrationWarning>Received {whenLong(item.createdAt)}</span>
        </div>
      </div>

      <div className="p-5">
        <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-slate-800">{item.message}</p>
      </div>

      <div className="space-y-4 border-t border-slate-100 bg-[#FBFCFE] p-5">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-slate-900">Status</p>
          <div role="radiogroup" aria-label="Status" className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
            {HR_FEEDBACK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                onClick={() => { setStatus(s); setSaved(false); }}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-medium transition',
                  status === s ? 'bg-[#EBF3FE] text-[#0C447C]' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[s])} />
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {item.anonymous ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3.5 py-3 text-[12.5px] text-slate-500">
            Replies aren’t available for anonymous feedback. Use the status to track what you’ve done about it.
          </p>
        ) : (
          <div>
            <label htmlFor={`reply-${item.id}`} className="mb-2 block text-[12px] font-semibold text-slate-900">
              Reply to {firstName}
              <span className="ml-1.5 font-normal text-slate-400">· {firstName} sees this on their Feedback to HR page</span>
            </label>
            <textarea
              id={`reply-${item.id}`}
              value={response}
              onChange={(e) => { setResponse(e.target.value); setSaved(false); }}
              rows={4}
              maxLength={RESPONSE_MAX}
              placeholder={`Thanks ${firstName}, here’s what we’re doing about it…`}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/15 sm:text-[13.5px]"
            />
            {item.respondedAt && (
              <p className="mt-1 text-[11.5px] text-slate-400" suppressHydrationWarning>
                Last reply sent {whenLong(item.respondedAt)}{item.handledByName ? ` by ${item.handledByName}` : ''}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-[13px] font-medium text-red-600" role="alert">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || !dirty}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0C447C] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0A3A6A] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {!item.anonymous && response.trim() && response.trim() !== (item.response ?? '') ? 'Send reply' : 'Save'}
          </button>
          {status !== 'resolved' && (
            <button
              type="button"
              onClick={() => save('resolved')}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
              {!item.anonymous && response.trim() && response.trim() !== (item.response ?? '') ? 'Send and resolve' : 'Mark resolved'}
            </button>
          )}
          {saved && !dirty && <span className="text-[12.5px] font-medium text-[#0F6E56]">Saved</span>}
          {item.handledByName && !saved && (
            <span className="ml-auto text-[11.5px] text-slate-400">Last updated by {item.handledByName}</span>
          )}
        </div>
      </div>
    </article>
  );
}
