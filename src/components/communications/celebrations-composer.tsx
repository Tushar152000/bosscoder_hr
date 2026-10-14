'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  AlertCircle, AtSign, Briefcase, Cake, Check, CheckCircle2, Download, FlaskConical, Hash,
  ImagePlus, Plus, RotateCcw, Search, Send, Undo2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialog } from '@/components/ui/modal';
import { cn, initials } from '@/lib/utils';
import {
  composeMessage, defaultIntro, defaultNote, upcomingOccasions, yearsCompleted, yearsLabel,
  type CelebrationKind, type CelebrationPerson, type Occasion,
} from '@/lib/celebrations/message';
import {
  previewCelebrationCardAction, sendCelebrationAction, type SendCelebrationResult,
} from '@/app/(app)/communications/celebration-actions';

export interface SlackChannelOption {
  target: 'test' | 'live';
  name: string | null;
}

interface Props {
  people: CelebrationPerson[];
  todayISO: string;
  channels: SlackChannelOption[];
}

interface Draft {
  person: CelebrationPerson;
  kind: CelebrationKind;
  years: number;
  note: string;
  noteEdited: boolean;
  attachCard: boolean;
  /** Custom photo (JPEG data URL) for the card; null ⇒ profile photo. */
  photo: string | null;
}

const MAX_PEOPLE = 10;
const UPCOMING_DAYS = 7;

const channelLabel = (c: SlackChannelOption) =>
  c.name ?? (c.target === 'test' ? 'Test channel' : 'Company channel');

function whenLabel(inDays: number, todayISO: string): string {
  if (inDays === 0) return 'Today';
  if (inDays === 1) return 'Tomorrow';
  const [y, m, d] = todayISO.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + inDays)).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

function occasionLabel(kind: CelebrationKind, years: number): string {
  return kind === 'birthday' ? 'Birthday' : `${yearsLabel(years)} at Bosscoder`;
}

/** Square-crop and shrink a picked image to an 800px JPEG data URL. */
async function toCardPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('unreadable'));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(800, side);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = out;
    canvas.getContext('2d')!.drawImage(
      img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out,
    );
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Avatar({ person, size = 32 }: { person: CelebrationPerson; size?: number }) {
  return person.photoURL ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={person.photoURL} alt="" referrerPolicy="no-referrer"
      style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-[#0C447C] text-[11px] font-semibold text-white"
    >
      {initials(person.name, '')}
    </span>
  );
}

export function CelebrationsComposer({ people, todayISO, channels }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [introOverride, setIntroOverride] = useState<string | null>(null);
  const [mentionChannel, setMentionChannel] = useState(true);
  const [target, setTarget] = useState<'test' | 'live'>(channels[0]?.target ?? 'test');
  const [cards, setCards] = useState<Record<string, { key: string; url: string | null; error?: boolean }>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<(SendCelebrationResult & { channel: string }) | null>(null);
  const { confirm, dialog } = useDialog();

  const occasions = useMemo(() => upcomingOccasions(people, todayISO, UPCOMING_DAYS), [people, todayISO]);
  const suggestedIntro = defaultIntro(drafts.map((d) => ({ name: d.person.name, kind: d.kind, years: d.years })));
  const intro = introOverride ?? suggestedIntro;
  const message = composeMessage({
    mentionChannel,
    intro,
    celebrants: drafts.map((d) => ({ employeeId: d.person.employeeId, name: d.person.name, kind: d.kind, years: d.years, note: d.note })),
  });

  const configured = channels.length > 0;
  const channel = channels.find((c) => c.target === target) ?? null;
  const isAdded = (id: string) => drafts.some((d) => d.person.employeeId === id);

  function add(person: CelebrationPerson, kind: CelebrationKind, years: number) {
    if (isAdded(person.employeeId) || drafts.length >= MAX_PEOPLE) return;
    setSent(null);
    setDrafts((prev) => [
      ...prev,
      { person, kind, years, note: defaultNote({ kind, years }), noteEdited: false, attachCard: true, photo: null },
    ]);
  }

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.person.employeeId !== id) return d;
        const next = { ...d, ...patch };
        // Keep the suggested note in step with the occasion until HR writes their own.
        if (!next.noteEdited && (patch.kind !== undefined || patch.years !== undefined)) {
          next.note = defaultNote(next);
        }
        return next;
      }),
    );
  }

  function remove(id: string) {
    setDrafts((prev) => prev.filter((d) => d.person.employeeId !== id));
  }

  async function send() {
    if (!channel) return;
    setError(null);
    if (target === 'live') {
      const ok = await confirm({
        title: `Post to ${channelLabel(channel)}?`,
        body: mentionChannel
          ? 'This notifies everyone in the channel (@channel). It can only be removed from Slack itself.'
          : 'Everyone in the channel will see it. It can only be removed from Slack itself.',
        confirmLabel: 'Post now',
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const res = await sendCelebrationAction({
        target,
        mentionChannel,
        intro,
        celebrants: drafts.map((d) => ({
          employeeId: d.person.employeeId, kind: d.kind, years: d.years, note: d.note,
          attachCard: d.attachCard, photo: d.photo,
        })),
      });
      if (!res.ok) { setError(res.error); return; }
      setSent({ ...res.data, channel: channelLabel(channel) });
      // Keep the draft after a test post so it can go straight to the real channel.
      if (target === 'live') { setDrafts([]); setIntroOverride(null); }
    });
  }

  const today = occasions.filter((o) => o.inDays === 0);
  const later = occasions.filter((o) => o.inDays > 0);

  return (
    <div className="grid grid-cols-1 gap-4 pb-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      {dialog}

      {/* ── Left: who's being celebrated ─────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4">
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-slate-900">Today &amp; coming up</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">Birthdays and work anniversaries in the next {UPCOMING_DAYS} days</p>
            </div>
          </div>
          {occasions.length === 0 ? (
            <p className="rounded-lg bg-[#F8FAFC] px-3 py-4 text-center text-[13px] text-slate-500">
              No birthdays or work anniversaries in the next {UPCOMING_DAYS} days. Add someone below.
            </p>
          ) : (
            <div className="space-y-3">
              {today.length > 0 && <OccasionList title="Today" items={today} todayISO={todayISO} isAdded={isAdded} onAdd={add} full={drafts.length >= MAX_PEOPLE} />}
              {later.length > 0 && <OccasionList title="Coming up" items={later} todayISO={todayISO} isAdded={isAdded} onAdd={add} full={drafts.length >= MAX_PEOPLE} />}
            </div>
          )}
          <PersonSearch
            people={people}
            isAdded={isAdded}
            disabled={drafts.length >= MAX_PEOPLE}
            onPick={(p) => {
              const anniversaryToday = p.joined.slice(5) === todayISO.slice(5) && p.joined < todayISO;
              const kind: CelebrationKind = anniversaryToday || !p.dob ? 'anniversary' : 'birthday';
              add(p, kind, yearsCompleted(p.joined, todayISO));
            }}
          />
        </section>

        {drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white/60 px-4 py-10 text-center">
            <Cake className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-[13px] font-medium text-slate-600">No one added yet</p>
            <p className="mt-0.5 text-[12px] text-slate-400">Add people above — each gets a note and a card in the post.</p>
          </div>
        ) : (
          drafts.map((d) => (
            <DraftEditor
              key={d.person.employeeId}
              draft={d}
              named={drafts.length > 1}
              card={cards[d.person.employeeId]}
              onCard={(key, url, err) => setCards((prev) => ({ ...prev, [d.person.employeeId]: { key, url, error: err } }))}
              onChange={(patch) => update(d.person.employeeId, patch)}
              onRemove={() => remove(d.person.employeeId)}
            />
          ))
        )}
      </div>

      {/* ── Right: message + destination ─────────────────────────── */}
      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <section className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2.5 border-b border-[#E2E8F0] pb-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#FAEEDA]">
              <Cake className="h-4 w-4 text-[#854F0B]" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-900">Post to Slack</p>
              <p className="mt-0.5 text-[11px] text-slate-500">One message with everyone&apos;s @mention and card</p>
            </div>
          </div>

          {!configured && (
            <div className="flex items-start gap-2 rounded-md border border-[#FAC775] bg-[#FAEEDA] px-3 py-2.5 text-[12px] text-[#854F0B]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Slack isn&apos;t connected yet, so posting is off. You can still preview and download the cards.
                An admin needs to set <code>SLACK_BOT_TOKEN</code> and the channel IDs.
              </span>
            </div>
          )}

          {configured && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-slate-700">Channel</span>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                {(['test', 'live'] as const).map((t) => {
                  const c = channels.find((x) => x.target === t);
                  const Icon = t === 'test' ? FlaskConical : Hash;
                  return (
                    <button
                      key={t} type="button" disabled={!c} onClick={() => { setTarget(t); setSent(null); }}
                      title={c ? undefined : `Not set up (SLACK_CELEBRATIONS_${t === 'test' ? 'TEST_' : ''}CHANNEL_ID)`}
                      className={cn(
                        'flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
                        target === t ? 'bg-white text-[#0C447C] shadow-sm ring-1 ring-[#E2E8F0]' : 'text-slate-500 hover:text-slate-800',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c ? channelLabel(c) : t === 'test' ? 'Test channel' : 'Company channel'}</span>
                    </button>
                  );
                })}
              </div>
              {target === 'test' && (
                <p className="text-[11px] text-slate-400">Try it here first — the draft stays so you can post it for real next.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="celebration-intro" className="text-[12px] font-medium text-slate-700">Opening line</label>
              {introOverride !== null && (
                <button type="button" onClick={() => setIntroOverride(null)} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0C447C] hover:underline">
                  <RotateCcw className="h-3 w-3" /> Use suggested
                </button>
              )}
            </div>
            <textarea
              id="celebration-intro" rows={4} value={intro} disabled={drafts.length === 0}
              onChange={(e) => setIntroOverride(e.target.value)}
              placeholder="Add people to get a suggested opening line"
              className="w-full resize-none rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/15 disabled:bg-[#F8FAFC] sm:text-[13px]"
            />
            <p className="text-[11px] text-slate-400">Write people as <span className="font-medium text-slate-500">@Full Name</span> — they become real Slack mentions.</p>
            <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-[12px] text-slate-700">
              <input type="checkbox" checked={mentionChannel} onChange={(e) => setMentionChannel(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#0C447C]" />
              Start with <span className="rounded bg-[#FEF3C7] px-1 font-medium text-[#92400E]">@channel</span> (notifies everyone)
            </label>
          </div>

          <SlackPreview message={message} names={drafts.map((d) => d.person.name)} attachments={drafts.filter((d) => d.attachCard).map((d) => cards[d.person.employeeId]?.url ?? null)} />

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-[#FAC8C6] bg-[#FAECE7] px-3 py-2.5 text-[13px] text-[#993C1D]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          {sent && (
            <div className="flex items-start gap-2 rounded-md border border-[#B7DDD0] bg-[#E1F5EE] px-3 py-2.5 text-[13px] text-[#0F6E56]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Posted to {sent.channel}</p>
                {sent.notMentioned.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-[#854F0B]">
                    Couldn&apos;t find {sent.notMentioned.join(', ')} on Slack by work email, so they appear as plain text.
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            type="button" variant="primary" onClick={() => void send()}
            className="h-11 w-full gap-2 text-[14px]"
            isLoading={isPending}
            disabled={isPending || !configured || !channel || drafts.length === 0 || !message.trim()}
          >
            {!isPending && <Send className="h-4 w-4" />}
            {!isPending && (drafts.length === 0
              ? 'Add someone first'
              : !channel ? 'Slack not connected'
                : target === 'test' ? `Send to ${channelLabel(channel)}` : `Post to ${channelLabel(channel)}`)}
          </Button>
        </section>
      </aside>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function OccasionList({
  title, items, todayISO, isAdded, onAdd, full,
}: {
  title: string;
  items: Occasion[];
  todayISO: string;
  isAdded: (id: string) => boolean;
  onAdd: (p: CelebrationPerson, kind: CelebrationKind, years: number) => void;
  full: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <ul className="divide-y divide-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
        {items.map((o) => {
          const added = isAdded(o.person.employeeId);
          const Icon = o.kind === 'birthday' ? Cake : Briefcase;
          return (
            <li key={`${o.person.employeeId}-${o.kind}`} className="flex items-center gap-3 px-3 py-2">
              <Avatar person={o.person} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-900">{o.person.name}</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                  <Icon className={cn('h-3 w-3 shrink-0', o.kind === 'birthday' ? 'text-[#D85A30]' : 'text-[#0C447C]')} />
                  {occasionLabel(o.kind, o.years)} · {whenLabel(o.inDays, todayISO)}
                </p>
              </div>
              <Button
                type="button" size="sm" variant={added ? 'ghost' : 'secondary'} disabled={added || full}
                onClick={() => onAdd(o.person, o.kind, o.kind === 'anniversary' ? o.years : yearsCompleted(o.person.joined, todayISO))}
                className="shrink-0 gap-1"
              >
                {added ? <><Check className="h-3.5 w-3.5" /> Added</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PersonSearch({
  people, isAdded, disabled, onPick,
}: {
  people: CelebrationPerson[];
  isAdded: (id: string) => boolean;
  disabled: boolean;
  onPick: (p: CelebrationPerson) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return people.filter((p) => p.name.toLowerCase().includes(term) && !isAdded(p.employeeId)).slice(0, 6);
  }, [q, people, isAdded]);

  return (
    <div className="relative mt-4">
      <label htmlFor="celebration-search" className="mb-1.5 block text-[12px] font-medium text-slate-700">Add someone else</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="celebration-search" type="text" value={q} disabled={disabled} autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={disabled ? `Up to ${MAX_PEOPLE} people per post` : 'Search by name…'}
          className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white pl-9 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/15 disabled:bg-[#F8FAFC] sm:text-[13px]"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-lg">
          {matches.map((p) => (
            <li key={p.employeeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(p); setQ(''); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F8FAFC]"
              >
                <Avatar person={p} size={28} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-slate-900">{p.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{[p.designation, p.department].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim() && matches.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-slate-500 shadow-lg">No matching active employee.</p>
      )}
    </div>
  );
}

function DraftEditor({
  draft, named, card, onCard, onChange, onRemove,
}: {
  draft: Draft;
  /** Several people in the post ⇒ the note is prefixed with their @mention. */
  named: boolean;
  card: { key: string; url: string | null; error?: boolean } | undefined;
  onCard: (key: string, url: string | null, error?: boolean) => void;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const { person, kind, years, photo } = draft;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const cardKey = `${kind}|${kind === 'anniversary' ? years : 0}|${photo?.length ?? 0}:${photo?.slice(-32) ?? ''}`;
  const loading = !card || card.key !== cardKey;

  // Re-render the card whenever what's on it changes (debounced for the years input).
  useEffect(() => {
    if (card?.key === cardKey) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await previewCelebrationCardAction({ employeeId: person.employeeId, kind, years, photo }).catch(() => null);
      if (!cancelled) onCard(cardKey, res?.ok ? res.data : null, !res?.ok);
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey]);

  async function pickPhoto(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoError('Pick an image file.'); return; }
    try {
      onChange({ photo: await toCardPhoto(file) });
    } catch {
      setPhotoError("Couldn't read that image.");
    }
  }

  const KINDS: { key: CelebrationKind; label: string; icon: typeof Cake }[] = [
    { key: 'birthday', label: 'Birthday', icon: Cake },
    { key: 'anniversary', label: 'Work anniversary', icon: Briefcase },
  ];

  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar person={person} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-slate-900">{person.name}</p>
          <p className="truncate text-[12px] text-slate-500">{[person.designation, person.department].filter(Boolean).join(' · ')}</p>
        </div>
        <button type="button" onClick={onRemove} aria-label={`Remove ${person.name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_168px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
              {KINDS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key} type="button" onClick={() => onChange({ kind: key })}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition',
                    kind === key ? 'bg-white text-[#0C447C] shadow-sm ring-1 ring-[#E2E8F0]' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            {kind === 'anniversary' && (
              <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                <input
                  type="number" min={1} max={60} value={years}
                  onChange={(e) => onChange({ years: Math.min(60, Math.max(1, Number(e.target.value) || 1)) })}
                  className="h-8 w-14 rounded-md border border-[#E2E8F0] px-2 text-[16px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/15 sm:text-[13px]"
                />
                {years === 1 ? 'year' : 'years'}
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`note-${person.employeeId}`} className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
                {named ? (
                  <>Note after <span className="inline-flex items-center rounded bg-[#E8F2FB] px-1 text-[#1264A3]"><AtSign className="h-3 w-3" />{person.name}</span></>
                ) : (
                  'Note'
                )}
              </label>
              {draft.noteEdited && (
                <button type="button" onClick={() => onChange({ note: defaultNote(draft), noteEdited: false })} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0C447C] hover:underline">
                  <RotateCcw className="h-3 w-3" /> Suggested
                </button>
              )}
            </div>
            <textarea
              id={`note-${person.employeeId}`} rows={5} value={draft.note}
              onChange={(e) => onChange({ note: e.target.value, noteEdited: true })}
              placeholder="A few words about them — what they've done, how they've grown…"
              className="w-full resize-y rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[16px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/15 sm:text-[13px]"
            />
          </div>
        </div>

        {/* Card */}
        <div className="flex flex-col gap-2">
          <div className={cn('relative aspect-square w-full max-w-[220px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] sm:max-w-none', !draft.attachCard && 'opacity-40')}>
            {loading ? (
              <Skeleton shimmer className="h-full w-full rounded-none" />
            ) : card?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.url} alt={`${person.name} card`} className="h-full w-full object-cover" />
            ) : (
              <p className="grid h-full place-items-center px-3 text-center text-[11px] text-slate-400">Couldn&apos;t create the card</p>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-slate-700">
            <input type="checkbox" checked={draft.attachCard} onChange={(e) => onChange({ attachCard: e.target.checked })} className="h-4 w-4 rounded border-slate-300 accent-[#0C447C]" />
            Attach card
          </label>
          <div className="flex flex-wrap gap-1">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <Button type="button" size="sm" variant="secondary" className="gap-1 px-2" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5" /> {photo ? 'Change' : 'Photo'}
            </Button>
            {photo && (
              <Button type="button" size="sm" variant="ghost" className="gap-1 px-2" onClick={() => onChange({ photo: null })} title="Use their profile photo">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {card?.url && !loading && (
              <Button asChild size="sm" variant="ghost" className="gap-1 px-2">
                <a href={card.url} download={`${person.name.replace(/\s+/g, '-').toLowerCase()}-${kind}.png`} title="Download card">
                  <Download className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
          {photoError && <p className="text-[11px] text-[#993C1D]">{photoError}</p>}
          {!person.photoURL && !photo && <p className="text-[11px] text-slate-400">No profile photo — add one for the card.</p>}
        </div>
      </div>
    </section>
  );
}

/** Roughly how the post will look in Slack, with @mentions highlighted. */
function SlackPreview({ message, names, attachments }: { message: string; names: string[]; attachments: (string | null)[] }) {
  const parts = useMemo(() => {
    if (!message) return [];
    const escaped = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(@channel\\b${escaped.map((n) => `|@${n}`).join('')})`, 'g');
    return message.split(re);
  }, [message, names]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-slate-700">Preview</span>
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
        {message ? (
          <div className="flex gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#0C447C] text-[11px] font-bold text-white">HR</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px]">
                <span className="font-bold text-slate-900">Bosscoder HR</span>
                <span className="ml-1.5 rounded bg-slate-100 px-1 text-[9px] font-semibold uppercase text-slate-500">App</span>
              </p>
              <div className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-[1.5] text-[#1D1C1D]">
                {parts.map((p, i) => {
                  if (i % 2 === 0) return <span key={i}>{p}</span>;
                  if (p === '@channel') return <span key={i} className="rounded bg-[#FEF3C7] px-0.5 text-[#92400E]">{p}</span>;
                  // Mirrors toSlackText: tagged once, then plain bold.
                  if (parts.indexOf(p) !== i) return <b key={i} className="font-bold">{p.slice(1)}</b>;
                  return <span key={i} className="rounded bg-[#E8F2FB] px-0.5 text-[#1264A3]">{p}</span>;
                })}
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {attachments.map((url, i) =>
                    url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="h-20 w-20 rounded-md border border-[#E2E8F0] object-cover" />
                    ) : (
                      <Skeleton key={i} shimmer className="h-20 w-20 rounded-md" />
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-[12px] text-slate-400">Your message will appear here.</p>
        )}
      </div>
    </div>
  );
}
