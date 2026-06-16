'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  EyeOff,
  HeartHandshake,
  Home,
  Loader2,
  Lock,
  Pencil,
  Save,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/modal';
import { saveSelfEvalAction } from '@/app/(app)/performance/actions';
import { formatDate } from '@/lib/format';
import type { SelfEvalAnswers, SelfEvalInput, SubmissionStatus } from '@/types/review';

// ─── Question definitions ─────────────────────────────────────────────────────

interface Question {
  key: keyof SelfEvalAnswers;
  prompt: string;
  subtitle?: string;
  sidebarLabel: string;
  isPillar?: boolean;
}

const QUESTIONS: Question[] = [
  {
    key: 'contributions',
    prompt:
      'What contributions did you make in the last month, and what was the resulting business impact?',
    subtitle: 'Concrete projects, deliverables, and the measurable outcome — numbers help.',
    sidebarLabel: 'Contributions & impact',
  },
  {
    key: 'upcomingDeliverables',
    prompt:
      'What are your key deliverables and expected business impact for the upcoming month?',
    subtitle:
      "Pick 2–4 things you're committing to — concrete enough to revisit next cycle.",
    sidebarLabel: 'Next month plan',
  },
  {
    key: 'culturalPillars',
    prompt: 'How did you showcase our cultural pillars in your daily work?',
    sidebarLabel: 'Cultural pillars',
    isPillar: true,
  },
  {
    key: 'biggestChallenge',
    prompt: 'What was your biggest challenge this month and how did you handle it?',
    subtitle: "Be honest — challenges aren't weaknesses. We learn from them.",
    sidebarLabel: 'Biggest challenge',
  },
  {
    key: 'learnedOrImproved',
    prompt: 'Where do you need more support from your manager or the org?',
    subtitle: 'Tools, mentorship, clarity, time — be specific so we can act on it.',
    sidebarLabel: 'Support needed',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function useRelativeTime(date: Date | null): string | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!date) return;
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, [date]);
  if (!date) return null;
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 15) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SaveIndicator({
  state,
  lastSavedAt,
  size = 11,
}: {
  state: SaveState;
  lastSavedAt: Date | null;
  size?: number;
}) {
  const rel = useRelativeTime(lastSavedAt);
  if (state === 'saving')
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-slate-500" aria-live="polite">
        <Loader2 size={size} className="animate-spin" />
        Saving…
      </span>
    );
  if (state === 'error')
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-red-500" aria-live="polite">
        <AlertCircle size={size} />
        Failed — retrying
      </span>
    );
  if (state === 'saved' && rel)
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-slate-500" aria-live="polite">
        <Save size={size} />
        Auto-saved {rel}
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-slate-400" aria-live="polite">
      <Save size={size} />
      Not saved yet
    </span>
  );
}

function StatusChip({ status }: { status: SubmissionStatus }) {
  if (status === 'submitted')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#0F6E56]">
        <Check size={10} />
        Submitted
      </span>
    );
  if (status === 'locked')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface border border-divider text-slate-600">
        <Lock size={10} />
        Closed
      </span>
    );
  if (status === 'in-progress')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-soft text-brand">
        <Pencil size={10} />
        In progress
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface border border-divider text-slate-600">
      <Clock size={10} />
      Not started
    </span>
  );
}

function PillarChips() {
  return (
    <div className="flex gap-1.5 mt-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-[#534AB7] bg-[#EEEDFE]">
        <HeartHandshake size={11} />
        Customer centric
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-[#854F0B] bg-[#FAEEDA]">
        <Zap size={11} />
        Fast execution
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-[#0F6E56] bg-[#E1F5EE]">
        <Sparkles size={11} />
        Excellent quality
      </span>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

interface CardProps {
  id: string;
  question: Question;
  index: number;
  value: string;
  state: 'answered' | 'active' | 'untouched';
  readOnly: boolean;
  saveState: SaveState;
  lastSavedAt: Date | null;
  onChange: (value: string) => void;
  onEdit: () => void;
  onFocus: () => void;
}

const QuestionCard = forwardRef<HTMLDivElement, CardProps>(
  (
    { id, question, index, value, state, readOnly, saveState, lastSavedAt, onChange, onEdit, onFocus },
    ref
  ) => {
    const wc = wordCount(value);
    const isLong = value.length > 280;
    const rel = useRelativeTime(lastSavedAt);

    return (
      <div
        ref={ref}
        id={id}
        style={{ scrollMarginTop: 80 }}
        className={cn(
          'bg-surface rounded-xl p-4 shadow-card transition-all',
          state === 'active'
            ? 'border border-brand shadow-[0_2px_6px_rgba(12,68,124,0.08)]'
            : state === 'answered'
            ? 'border border-divider'
            : 'border border-divider opacity-[0.93]'
        )}
      >
  
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className={cn(
                'w-6 h-6 rounded-full text-[11px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5',
                state === 'answered'
                  ? 'bg-[#E1F5EE] text-[#0F6E56]'
                  : state === 'active'
                  ? 'bg-brand text-white'
                  : 'bg-surface-muted text-slate-500 border border-divider'
              )}
            >
              {state === 'answered' ? <Check size={11} /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-900 leading-snug">
                {question.prompt}
              </p>
              {question.subtitle && (
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {question.subtitle}
                </p>
              )}
              {question.isPillar && <PillarChips />}
            </div>
          </div>
          {state === 'answered' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0F6E56] bg-[#E1F5EE] px-2 py-0.5 rounded-full flex-shrink-0">
              <Check size={10} />
              Answered
            </span>
          )}
        </div>

        {state === 'answered' ? (
          <div>
            <div
              className={cn(
                'relative bg-surface-muted border border-divider rounded-md p-3 text-[12px] text-slate-900 leading-relaxed whitespace-pre-wrap',
                isLong && 'max-h-[60px] overflow-hidden'
              )}
            >
              {value}
              {isLong && (
                <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-gradient-to-t from-surface-muted to-transparent pointer-events-none" />
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-500">
                {wc} {wc === 1 ? 'word' : 'words'}
                {rel && ` · saved ${rel}`}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:text-brand-hover transition-colors"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              )}
            </div>
          </div>
        ) : state === 'active' ? (
          <div>
            <div className="relative">
              <textarea
                aria-label={question.prompt}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={onFocus}
                readOnly={readOnly}
                rows={5}
                placeholder="Start typing…"
                className="w-full min-h-[130px] p-3 bg-white border border-divider rounded-md text-[12px] text-slate-900 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand transition placeholder:text-slate-400"
              />
              <span
                className={cn(
                  'absolute bottom-2 right-3 text-[10px] pointer-events-none',
                  wc >= 1000
                    ? 'text-[#993C1D]'
                    : wc >= 900
                    ? 'text-[#854F0B]'
                    : 'text-slate-400'
                )}
              >
                {wc} / 1000
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
              <span className="text-[10px] text-slate-400">Tip · use Cmd+S to save now</span>
            </div>
          </div>
        ) : (
          <textarea
            aria-label={question.prompt}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            readOnly={readOnly}
            rows={3}
            placeholder="Click to start answering…"
            className="w-full min-h-[80px] p-3 bg-white border border-divider rounded-md text-[12px] text-slate-900 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand transition placeholder:text-slate-400"
          />
        )}
      </div>
    );
  }
);
QuestionCard.displayName = 'QuestionCard';

interface Props {
  submissionId: string;
  cycleId: string;
  cycleName: string;
  subjectName: string;
  subjectDepartment: string;
  initial: SelfEvalInput;
  status: SubmissionStatus;
  submittedAt: Date | null;
  canEdit: boolean;
}


export function SelfEvalForm({
  submissionId,
  cycleId,
  cycleName,
  subjectName,
  subjectDepartment,
  initial,
  status,
  submittedAt,
  canEdit,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { confirm, dialog } = useDialog();

  const [answers, setAnswers] = useState<SelfEvalAnswers>(initial.answers);
  const [activeIdx, setActiveIdx] = useState<number>(() => {
    const first = QUESTIONS.findIndex(
      (q) => (initial.answers[q.key] ?? '').trim().length < 20
    );
    return first >= 0 ? first : 0;
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const isDirty = useRef(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isFinal = status === 'submitted' || status === 'locked';
  const readOnly = isFinal || !canEdit;

  const answeredCount = QUESTIONS.filter(
    (q) => (answers[q.key] ?? '').trim().length >= 1
  ).length;

  // ── Auto-save ─────────────────────────────────────────────────────────────

  const doSave = useCallback(
    async (isRetry = false) => {
      if (!isRetry) {
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryCount.current = 0;
      }
      setSaveState('saving');
      const res = await saveSelfEvalAction({
        submissionId,
        input: { answers: answersRef.current },
        submit: false,
      });
      if (res.ok) {
        setSaveState('saved');
        setLastSavedAt(new Date());
        retryCount.current = 0;
      } else {
        setSaveState('error');
        if (retryCount.current < 3) {
          retryCount.current++;
          retryTimer.current = setTimeout(() => doSave(true), 3000);
        }
      }
    },
    [submissionId]
  );

  useEffect(() => {
    if (readOnly || !isDirty.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSave(false), 800);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [answers, readOnly, doSave]);

  // Cmd+S / Ctrl+S — immediate save
  useEffect(() => {
    if (readOnly) return;
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        doSave(false);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [readOnly, doSave]);

  // Warn on refresh / tab close with unsaved changes
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty.current && saveState !== 'saved') {
        e.preventDefault();
        // eslint-disable-next-line deprecation/deprecation -- required for Chrome
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const topmost = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!topmost) return;
        const idx = cardRefs.current.findIndex((r) => r === topmost.target);
        if (idx < 0) return;
        const isAnswered =
          (answersRef.current[QUESTIONS[idx].key] ?? '').trim().length >= 1;
        if (!isAnswered) setActiveIdx(idx);
      },
      { root: scrollContainerRef.current, threshold: 0.4, rootMargin: '0px 0px -40% 0px' }
    );
    cardRefs.current.forEach((r) => r && observer.observe(r));
    return () => observer.disconnect();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function setAnswer(key: keyof SelfEvalAnswers, value: string) {
    isDirty.current = true;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function scrollTo(idx: number) {
    setActiveIdx(idx);
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit() {
    const ok = await confirm({
      title: 'Submit your evaluation?',
      body: "Once submitted, your answers will be shared with your manager and you won't be able to edit them. Make sure your reflections feel complete.",
      confirmLabel: 'Yes, submit',
    });
    if (!ok) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await saveSelfEvalAction({
        submissionId,
        input: { answers: answersRef.current },
        submit: true,
      });
      if (res.ok) {
        router.push('/performance');
        router.refresh();
      } else {
        setSubmitError(res.error);
      }
    });
  }

  function handleSaveAndExit() {
    startTransition(async () => {
      await saveSelfEvalAction({
        submissionId,
        input: { answers: answersRef.current },
        submit: false,
      });
      router.push('/performance');
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:px-10 px-6">
      {dialog}  
      <div className="flex-shrink-0 pt-5 pb-3">
        <nav className="flex items-center gap-1.5 text-[14px] text-slate-400 mb-1.5">
          <Link href="/" className="flex items-center hover:text-slate-600 transition-colors">
            <Home size={12} />
          </Link>
          <ChevronRight size={11} />
          <Link href="/performance" className="hover:text-slate-600 transition-colors">
            Performance
          </Link>
          <ChevronRight size={11} />
          <Link
            href={`/performance/cycles/${cycleId}`}
            className="hover:text-slate-600 transition-colors"
          >
            {cycleName}
          </Link>
          <ChevronRight size={11} />
          <span className="text-slate-500 font-medium">Self-evaluation</span>
        </nav>

        <header className="flex items-start justify-between gap-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[28px] font-medium text-slate-900">
                Self-evaluation · {cycleName}
              </h1>
              <StatusChip status={status} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {subjectName} · {subjectDepartment}
              {status === 'submitted' && submittedAt && (
                <>
                  {' '}· Submitted on{' '}
                  <strong className="font-medium text-slate-900">{formatDate(submittedAt)}</strong>
                </>
              )}
            </p>
          </div>
        </header>
      </div>

      <div className="flex-1 min-h-0 flex gap-3  overflow-hidden">

        <aside className="w-[220px] flex-shrink-0 flex flex-col gap-2.5 overflow-y-auto py-3">
          <div className="bg-surface border border-divider rounded-xl p-3.5 shadow-card">
            <p className="text-[14px] tracking-[1px] text-slate-600 font-medium mb-1.5">PROGRESS</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[20px] font-medium text-slate-900">{answeredCount}</span>
              <span className="text-[11px] text-slate-500">of 5 answered</span>
            </div>
            <div className="mt-1.5 h-[3px] bg-surface-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / 5) * 100}%` }}
              />
            </div>

            <div className="pt-2.5 mt-2.5 border-t border-divider">
              <div className="flex flex-col gap-0.5">
                {QUESTIONS.map((q, idx) => {
                  const isAnswered = (answers[q.key] ?? '').trim().length >= 1;
                  const isActive = idx === activeIdx;
                  return (
                    <a
                      key={q.key}
                      href={`#question-${idx}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollTo(idx);
                      }}
                      className={cn(
                        'flex items-start gap-2 p-4 rounded-md cursor-pointer transition-colors',
                        isActive ? 'bg-brand-soft' : 'hover:bg-surface-muted'
                      )}
                    >
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 text-[14px] font-medium',
                          isAnswered
                            ? 'bg-[#1D9E75]'
                            : isActive
                            ? 'bg-brand text-white'
                            : 'bg-surface border border-divider text-slate-500'
                        )}
                      >
                        {isAnswered ? <Check size={8} color="white" /> : idx + 1}
                      </span>
                      <span
                        className={cn(
                          'text-[12px] leading-snug',
                          isActive ? 'text-brand font-medium' : 'text-slate-500'
                        )}
                      >
                        {q.sidebarLabel}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-divider flex flex-col gap-1.5">
              <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} size={11} />
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <EyeOff size={11} />
                Only you &amp; your manager can see this
              </span>
            </div>
          </div>

          <div className="bg-[#FAEEDA] border border-[#FAC775] rounded-md p-2.5 flex gap-2">
            <AlertCircle size={13} color="#854F0B" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-[#854F0B]">Submit is final</p>
              <p className="text-[10px] text-[#854F0B] leading-snug">
                Once submitted, you can&apos;t edit. Drafts auto-save as you type.
              </p>
            </div>
          </div>
        </aside>

        {/* Right — only this column scrolls */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-3">
          <div className="flex flex-col gap-2.5">
            {status === 'submitted' && submittedAt && (
              <div className="bg-[#E1F5EE] border border-[#A4DFC4] rounded-md px-3 py-2.5 flex gap-2">
                <Check size={14} color="#0F6E56" className="mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-[#0F6E56]">
                  Submitted on {formatDate(submittedAt)}. Waiting for your manager&apos;s review.
                </p>
              </div>
            )}
            {status === 'locked' && (
              <div className="bg-surface-muted border border-divider rounded-md px-3 py-2.5 flex gap-2">
                <Lock size={13} className="mt-0.5 flex-shrink-0 text-slate-500" />
                <p className="text-[12px] text-slate-600">
                  This cycle is closed. The form is no longer editable.
                </p>
              </div>
            )}
            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
                {submitError}
              </div>
            )}

            {QUESTIONS.map((q, idx) => {
              const value = answers[q.key] ?? '';
              const isAnswered = value.trim().length >= 1 && idx !== activeIdx;
              const isActive = idx === activeIdx;
              const cardState: 'answered' | 'active' | 'untouched' = isAnswered
                ? 'answered'
                : isActive
                ? 'active'
                : 'untouched';

              return (
                <QuestionCard
                  key={q.key}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  id={`question-${idx}`}
                  question={q}
                  index={idx}
                  value={value}
                  state={cardState}
                  readOnly={readOnly}
                  saveState={saveState}
                  lastSavedAt={lastSavedAt}
                  onChange={(val) => {
                    setAnswer(q.key, val);
                    setActiveIdx(idx);
                  }}
                  onEdit={() => setActiveIdx(idx)}
                  onFocus={() => setActiveIdx(idx)}
                />
              );
            })}
          </div>
        </div>

      </div>{/* end body row */}

      {/* ── Footer — always visible at bottom ── */}
      <div className="flex-shrink-0  py-3">
        <div className="bg-surface border border-divider rounded-xl px-4 py-2.5 shadow-[0_-2px_8px_rgba(12,68,124,0.06)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} size={13} />
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500">{answeredCount} of 5 answered</span>
          </div>
          <div className="flex gap-1.5">
            {isFinal ? (
              <Button variant="secondary" size="sm" onClick={() => router.push('/performance')}>
                Back to Performance
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={handleSaveAndExit}>
                  Save &amp; exit
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={answeredCount < 5}
                  onClick={handleSubmit}
                >
                  <Send size={13} />
                  {answeredCount < 5 ? `Submit (${5 - answeredCount} left)` : 'Submit'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
