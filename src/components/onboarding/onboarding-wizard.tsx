'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  FileText,
  Home,
  IdCard,
  Lock,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Field, INPUT_CLASS } from '@/components/forms/field';
import { PhoneField } from '@/components/forms/phone-field';
import { formatPhone, toE164 } from '@/lib/phone';
import { ONBOARDING_STEPS, allErrors, stepErrors, type OnboardingStep } from '@/lib/onboarding/validate';
import { saveOnboardingAction, submitOnboardingAction, uploadOnboardingDocumentAction } from '@/app/join/actions';
import type { AddressFields } from '@/types/employee';
import type { OnboardingAnswers } from '@/types/onboarding';

export interface UploadedDoc {
  docType: 'aadhaar' | 'pan';
  fileName: string;
  contentType: string;
  href: string;
}

const RELATIONS = ['Father', 'Mother', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Guardian', 'Friend'];
const STEP_ICONS: Record<OnboardingStep, typeof User> = {
  personal: User,
  family: Users,
  address: Home,
  identity: IdCard,
  previous: Briefcase,
};
type StepId = OnboardingStep | 'review';
const ALL_STEPS: { id: StepId; label: string }[] = [...ONBOARDING_STEPS, { id: 'review', label: 'Review' }];

interface Props {
  token: string;
  name: string;
  designation: string;
  workEmail: string;
  initial: OnboardingAnswers;
  uploaded: UploadedDoc[];
  /** HR sent the form back with this note. */
  hrNote: string | null;
}

/** The joiner's onboarding form: five short steps, saved on every "Next", then review & submit. */
export function OnboardingWizard({ token, name, designation, workEmail, initial, uploaded, hrNote }: Props) {
  const router = useRouter();
  const [a, setA] = useState<OnboardingAnswers>(() => ({
    ...initial,
    phone: toE164(initial.phone) || null,
    family: {
      ...initial.family,
      fatherPhone: toE164(initial.family.fatherPhone) || null,
      motherPhone: toE164(initial.family.motherPhone) || null,
    },
    emergencyContact: { ...initial.emergencyContact, phone: toE164(initial.emergencyContact.phone) || null },
    previousEmployment: {
      ...initial.previousEmployment,
      managerPhone: toE164(initial.previousEmployment.managerPhone) || null,
    },
  }));
  const [docs, setDocs] = useState<UploadedDoc[]>(uploaded);
  const [step, setStep] = useState<StepId>('personal');
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, start] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  const docFlags = { aadhaar: docs.some((d) => d.docType === 'aadhaar'), pan: docs.some((d) => d.docType === 'pan') };
  const errors = step === 'review' ? allErrors(a, docFlags) : stepErrors(step, a, docFlags);
  const err = (path: string) => (showErrors ? (errors[path] ?? null) : null);
  const stepIdx = ALL_STEPS.findIndex((s) => s.id === step);
  const doneSteps = new Set(ONBOARDING_STEPS.filter((s) => !Object.keys(stepErrors(s.id, a, docFlags)).length).map((s) => s.id));
  const first = name.split(' ')[0] || name;

  const set = <K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) => setA((x) => ({ ...x, [k]: v }));
  function setIn<G extends 'family' | 'emergencyContact' | 'address' | 'permanentAddress' | 'previousEmployment'>(
    g: G,
    k: keyof OnboardingAnswers[G],
    v: string,
  ) {
    setA((x) => ({ ...x, [g]: { ...x[g], [k]: v || null } }));
  }

  function go(to: StepId) {
    setStep(to);
    setShowErrors(false);
    setError(null);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function next() {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      setError('Please fix the highlighted fields.');
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveOnboardingAction(token, a);
      if (!res.ok) { setError(res.error); return; }
      setSavedAt(new Date());
      go(ALL_STEPS[stepIdx + 1]!.id);
    });
  }

  function submit() {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      setError('Some answers are missing — use Edit next to the section to fix them.');
      return;
    }
    start(async () => {
      const res = await submitOnboardingAction(token, a);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  return (
    <div ref={topRef} className="scroll-mt-4 space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-950">Welcome to Bosscoder, {first}!</h1>
        <p className="mt-1 text-[13px] text-slate-800">
          {designation ? `${designation} · ` : ''}{workEmail}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-800">
          Please fill in your details for HR. It takes about 10 minutes and saves as you go — you can close this page and come
          back to the same link later.
        </p>
      </div>

      {hrNote && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-[13px] font-medium text-amber-900">HR asked for a change</p>
            <p className="mt-0.5 whitespace-pre-line text-[13px] text-amber-800">{hrNote}</p>
          </div>
        </div>
      )}

      {/* Steps */}
      <ol className="flex gap-1.5 overflow-x-auto pb-1">
        {ALL_STEPS.map((s, i) => {
          const active = s.id === step;
          const done = s.id !== 'review' && doneSteps.has(s.id) && i < stepIdx;
          const reachable = i <= stepIdx || ALL_STEPS.slice(0, i).every((p) => p.id === 'review' || doneSteps.has(p.id as OnboardingStep));
          return (
            <li key={s.id} className="flex-1 min-w-[92px]">
              <button
                type="button"
                disabled={!reachable || pending}
                onClick={() => go(s.id)}
                className={cn(
                  'w-full rounded-lg border px-2.5 py-2 text-left transition',
                  active ? 'border-[#0C447C] bg-white shadow-sm' : 'border-slate-200/70 bg-white/60',
                  reachable && !active && 'hover:bg-white',
                  !reachable && 'opacity-50',
                )}
              >
                <span className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider', active ? 'text-[#0C447C]' : 'text-slate-700')}>
                  {done ? <Check className="h-3 w-3 text-[#0F6E56]" /> : `${i + 1}.`}
                </span>
                <span className={cn('mt-0.5 block truncate text-[12px] font-medium', active ? 'text-slate-950' : 'text-slate-800')}>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6">
        {step === 'personal' && (
          <Section icon={STEP_ICONS.personal} title="About you" hint="So HR can reach you outside work.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" className="sm:col-span-2" helpText="As HR has it. If it's spelled wrong, tell HR.">
                <input className={INPUT_CLASS} value={name} disabled />
              </Field>
              <Field label="Personal mobile number" required error={err('phone')}>
                <PhoneField value={a.phone ?? ''} onChange={(v) => set('phone', v || null)} />
              </Field>
              <Field label="Personal email" required error={err('personalEmail')}>
                <input type="email" className={INPUT_CLASS} value={a.personalEmail ?? ''} onChange={(e) => set('personalEmail', e.target.value || null)} placeholder="you@gmail.com" />
              </Field>
              <Field label="Date of birth" required error={err('dob')}>
                <input type="date" className={INPUT_CLASS} value={a.dob ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('dob', e.target.value || null)} />
              </Field>
            </div>
          </Section>
        )}

        {step === 'family' && (
          <Section icon={STEP_ICONS.family} title="Family & emergency contact" hint="Only HR can see these.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Father's full name" required error={err('family.fatherName')}>
                <input className={INPUT_CLASS} value={a.family.fatherName ?? ''} onChange={(e) => setIn('family', 'fatherName', e.target.value)} />
              </Field>
              <Field label="Father's mobile number" required error={err('family.fatherPhone')}>
                <PhoneField value={a.family.fatherPhone ?? ''} onChange={(v) => setIn('family', 'fatherPhone', v)} />
              </Field>
              <Field label="Mother's full name" required error={err('family.motherName')}>
                <input className={INPUT_CLASS} value={a.family.motherName ?? ''} onChange={(e) => setIn('family', 'motherName', e.target.value)} />
              </Field>
              <Field label="Mother's mobile number" required error={err('family.motherPhone')}>
                <PhoneField value={a.family.motherPhone ?? ''} onChange={(v) => setIn('family', 'motherPhone', v)} />
              </Field>
            </div>
            <p className="mb-3 mt-6 text-[13px] font-medium text-slate-950">Emergency contact</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Name" required error={err('emergencyContact.name')}>
                <input className={INPUT_CLASS} value={a.emergencyContact.name ?? ''} onChange={(e) => setIn('emergencyContact', 'name', e.target.value)} />
              </Field>
              <Field label="Mobile number" required error={err('emergencyContact.phone')}>
                <PhoneField value={a.emergencyContact.phone ?? ''} onChange={(v) => setIn('emergencyContact', 'phone', v)} />
              </Field>
              <Field label="Relationship" required error={err('emergencyContact.relation')}>
                <input
                  className={INPUT_CLASS}
                  list="onboarding-relations"
                  value={a.emergencyContact.relation ?? ''}
                  onChange={(e) => setIn('emergencyContact', 'relation', e.target.value)}
                  placeholder="e.g. Father"
                />
                <datalist id="onboarding-relations">
                  {RELATIONS.map((r) => <option key={r} value={r} />)}
                </datalist>
              </Field>
            </div>
          </Section>
        )}

        {step === 'address' && (
          <Section icon={STEP_ICONS.address} title="Address" hint="Where you live now, and your permanent home address.">
            <p className="mb-3 text-[13px] font-medium text-slate-950">Current address</p>
            <AddressInputs prefix="address" value={a.address} onChange={(k, v) => setIn('address', k, v)} err={err} />
            <label className="mt-6 flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={a.permanentSame}
                onChange={(e) => set('permanentSame', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#0C447C]"
              />
              My permanent address is the same
            </label>
            {!a.permanentSame && (
              <>
                <p className="mb-3 mt-5 text-[13px] font-medium text-slate-950">Permanent address</p>
                <AddressInputs prefix="permanentAddress" value={a.permanentAddress} onChange={(k, v) => setIn('permanentAddress', k, v)} err={err} />
              </>
            )}
          </Section>
        )}

        {step === 'identity' && (
          <Section icon={STEP_ICONS.identity} title="ID documents" hint="Needed for payroll and PF. Stored encrypted; only HR can see them.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="PAN number" required error={err('pan')}>
                <input
                  className={cn(INPUT_CLASS, 'uppercase')}
                  value={a.pan ?? ''}
                  onChange={(e) => set('pan', e.target.value.toUpperCase() || null)}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  autoComplete="off"
                />
              </Field>
              <Field label="Aadhaar number" required error={err('aadhaar')}>
                <input
                  className={INPUT_CLASS}
                  inputMode="numeric"
                  value={a.aadhaar ?? ''}
                  onChange={(e) => set('aadhaar', e.target.value.replace(/[^\d ]/g, '') || null)}
                  placeholder="1234 5678 9012"
                  maxLength={14}
                  autoComplete="off"
                />
              </Field>
              <Field label="UAN" required={!a.noUan} error={err('uan')} helpText="12-digit PF number from your last job">
                <input
                  className={INPUT_CLASS}
                  inputMode="numeric"
                  value={a.noUan ? '' : (a.uan ?? '')}
                  disabled={a.noUan}
                  onChange={(e) => set('uan', e.target.value.replace(/[^\d ]/g, '') || null)}
                  placeholder={a.noUan ? "Don't have one" : '1001 2345 6789'}
                  maxLength={14}
                  autoComplete="off"
                />
              </Field>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={a.noUan}
                onChange={(e) => set('noUan', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#0C447C]"
              />
              I don&apos;t have a UAN (never had a PF account)
            </label>

            <p className="mb-1 mt-6 text-[13px] font-medium text-slate-950">Photos of your cards</p>
            <p className="mb-3 text-[12px] text-slate-800">A clear photo or scan — JPG, PNG or PDF, up to 10 MB. For Aadhaar, include both sides (a PDF is easiest).</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(['pan', 'aadhaar'] as const).map((t) => (
                <DocUpload
                  key={t}
                  token={token}
                  docType={t}
                  doc={docs.find((d) => d.docType === t) ?? null}
                  error={err(`doc.${t}`)}
                  onUploaded={(d) => { setDocs((prev) => [...prev.filter((x) => x.docType !== t), d]); setSavedAt(new Date()); }}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 'previous' && (
          <Section icon={STEP_ICONS.previous} title="Previous job" hint="Your last company and reporting manager, for reference.">
            <label className="mb-5 flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={a.firstJob}
                onChange={(e) => set('firstJob', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#0C447C]"
              />
              This is my first job
            </label>
            {!a.firstJob && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Previous company name" required className="sm:col-span-2" error={err('previousEmployment.company')}>
                  <input className={INPUT_CLASS} value={a.previousEmployment.company ?? ''} onChange={(e) => setIn('previousEmployment', 'company', e.target.value)} />
                </Field>
                <Field label="Reporting manager's name" required error={err('previousEmployment.managerName')}>
                  <input className={INPUT_CLASS} value={a.previousEmployment.managerName ?? ''} onChange={(e) => setIn('previousEmployment', 'managerName', e.target.value)} />
                </Field>
                <Field label="Reporting manager's mobile" required error={err('previousEmployment.managerPhone')}>
                  <PhoneField value={a.previousEmployment.managerPhone ?? ''} onChange={(v) => setIn('previousEmployment', 'managerPhone', v)} />
                </Field>
                <Field label="Reporting manager's email" required className="sm:col-span-2" error={err('previousEmployment.managerEmail')}>
                  <input type="email" className={INPUT_CLASS} value={a.previousEmployment.managerEmail ?? ''} onChange={(e) => setIn('previousEmployment', 'managerEmail', e.target.value)} />
                </Field>
              </div>
            )}
          </Section>
        )}

        {step === 'review' && (
          <Review a={a} docs={docs} onEdit={go} errorsBySection={(id) => Object.keys(stepErrors(id, a, docFlags)).length > 0} />
        )}

        {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-4">
          {stepIdx > 0 ? (
            <button
              type="button"
              onClick={() => go(ALL_STEPS[stepIdx - 1]!.id)}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            {savedAt && !pending && <span className="hidden text-[11px] text-slate-700 sm:inline">Saved</span>}
            {step === 'review' ? (
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#0C447C] px-5 text-[13px] font-semibold text-white transition hover:bg-[#0a3a6a] disabled:opacity-60"
              >
                {pending ? 'Submitting…' : 'Submit to HR'} {!pending && <Check className="h-4 w-4" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                disabled={pending}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#0C447C] px-5 text-[13px] font-semibold text-white transition hover:bg-[#0a3a6a] disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save & continue'} {!pending && <ArrowRight className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-700">
        <Lock className="h-3 w-3" /> Your details are encrypted and only visible to Bosscoder HR.
      </p>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: typeof User; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#E6F1FB]">
          <Icon className="h-[18px] w-[18px] text-[#0C447C]" />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-slate-950">{title}</h2>
          <p className="text-[12px] text-slate-800">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function AddressInputs({
  prefix,
  value,
  onChange,
  err,
}: {
  prefix: string;
  value: AddressFields;
  onChange: (k: keyof AddressFields, v: string) => void;
  err: (path: string) => string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="House / flat, street" required className="sm:col-span-2" error={err(`${prefix}.line1`)}>
        <input className={INPUT_CLASS} value={value.line1 ?? ''} onChange={(e) => onChange('line1', e.target.value)} />
      </Field>
      <Field label="Area / landmark" optional className="sm:col-span-2">
        <input className={INPUT_CLASS} value={value.line2 ?? ''} onChange={(e) => onChange('line2', e.target.value)} />
      </Field>
      <Field label="City" required error={err(`${prefix}.city`)}>
        <input className={INPUT_CLASS} value={value.city ?? ''} onChange={(e) => onChange('city', e.target.value)} />
      </Field>
      <Field label="State" required error={err(`${prefix}.state`)}>
        <input className={INPUT_CLASS} value={value.state ?? ''} onChange={(e) => onChange('state', e.target.value)} />
      </Field>
      <Field label="Pincode" required error={err(`${prefix}.pincode`)}>
        <input className={INPUT_CLASS} inputMode="numeric" maxLength={6} value={value.pincode ?? ''} onChange={(e) => onChange('pincode', e.target.value.replace(/\D/g, ''))} />
      </Field>
    </div>
  );
}

const DOC_LABELS = { pan: 'PAN card', aadhaar: 'Aadhaar card' } as const;

function DocUpload({
  token,
  docType,
  doc,
  error,
  onUploaded,
}: {
  token: string;
  docType: 'pan' | 'aadhaar';
  doc: UploadedDoc | null;
  error: string | null;
  onUploaded: (d: UploadedDoc) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadError('That file is over 10 MB — try a smaller photo.'); return; }
    setUploadError(null);
    const fd = new FormData();
    fd.append('token', token);
    fd.append('docType', docType);
    fd.append('file', file);
    start(async () => {
      const res = await uploadOnboardingDocumentAction(fd).catch(() => ({ ok: false as const, error: 'Upload failed — check your connection.' }));
      if (!res.ok) { setUploadError(res.error); return; }
      onUploaded({ docType, fileName: res.fileName, contentType: res.contentType, href: `/api/join/${token}/${docType}?v=${Date.now()}` });
    });
  }

  const isImage = doc?.contentType.startsWith('image/');
  return (
    <div className={cn('rounded-xl border p-3', error && !doc ? 'border-red-300 bg-red-50/40' : 'border-slate-200/70 bg-[#FAFAF7]')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-slate-800">{DOC_LABELS[docType]} <span className="text-red-500">*</span></p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {pending ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
        </button>
      </div>
      {doc ? (
        <a href={doc.href} target="_blank" rel="noopener noreferrer" className="mt-2 block">
          <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.href} alt={DOC_LABELS[docType]} className="h-full w-full object-contain" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-slate-700">
                <FileText className="h-6 w-6" />
                <span className="text-[11px]">PDF</span>
              </span>
            )}
          </div>
          <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-[#0F6E56]">
            <Check className="h-3 w-3 shrink-0" /> {doc.fileName}
          </p>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="mt-2 flex h-36 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white text-[12px] text-slate-700 transition hover:border-[#0C447C] hover:text-[#0C447C]"
        >
          <Upload className="h-5 w-5" />
          {pending ? 'Uploading…' : 'Tap to upload a photo'}
        </button>
      )}
      {(uploadError || (error && !doc)) && <p className="mt-1.5 text-[11px] text-red-600">{uploadError ?? error}</p>}
    </div>
  );
}

function Review({
  a,
  docs,
  onEdit,
  errorsBySection,
}: {
  a: OnboardingAnswers;
  docs: UploadedDoc[];
  onEdit: (s: StepId) => void;
  errorsBySection: (s: OnboardingStep) => boolean;
}) {
  const addr = (x: AddressFields) =>
    [x.line1, x.line2, [x.city, x.state].filter(Boolean).join(', '), x.pincode].filter(Boolean).join(', ') || '—';
  const ph = (v: string | null) => (v ? formatPhone(v) : '—');
  const sections: { id: OnboardingStep; rows: [string, string][] }[] = [
    { id: 'personal', rows: [['Mobile', ph(a.phone)], ['Personal email', a.personalEmail ?? '—'], ['Date of birth', a.dob ?? '—']] },
    {
      id: 'family',
      rows: [
        ['Father', `${a.family.fatherName ?? '—'} · ${ph(a.family.fatherPhone)}`],
        ['Mother', `${a.family.motherName ?? '—'} · ${ph(a.family.motherPhone)}`],
        ['Emergency contact', `${a.emergencyContact.name ?? '—'} (${a.emergencyContact.relation ?? '—'}) · ${ph(a.emergencyContact.phone)}`],
      ],
    },
    {
      id: 'address',
      rows: [['Current', addr(a.address)], ['Permanent', a.permanentSame ? 'Same as current' : addr(a.permanentAddress)]],
    },
    {
      id: 'identity',
      rows: [
        ['PAN', a.pan ?? '—'],
        ['Aadhaar', a.aadhaar ?? '—'],
        ['UAN', a.noUan ? "Doesn't have one" : (a.uan ?? '—')],
        ['Photos', (['pan', 'aadhaar'] as const).map((t) => `${DOC_LABELS[t]} ${docs.some((d) => d.docType === t) ? '✓' : '✗'}`).join(' · ')],
      ],
    },
    {
      id: 'previous',
      rows: a.firstJob
        ? [['Previous job', 'First job']]
        : [
            ['Company', a.previousEmployment.company ?? '—'],
            ['Manager', a.previousEmployment.managerName ?? '—'],
            ['Manager contact', `${ph(a.previousEmployment.managerPhone)} · ${a.previousEmployment.managerEmail ?? '—'}`],
          ],
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-slate-950">Review &amp; submit</h2>
        <p className="text-[12px] text-slate-800">Check everything once. After you submit, HR will verify it.</p>
      </div>
      <div className="space-y-3">
        {sections.map((s) => {
          const incomplete = errorsBySection(s.id);
          return (
            <div key={s.id} className={cn('overflow-hidden rounded-xl border', incomplete ? 'border-red-200' : 'border-slate-200/70')}>
              <div className={cn('flex items-center justify-between px-4 py-2.5', incomplete ? 'bg-red-50' : 'bg-[#FAFAF7]')}>
                <p className="text-[12px] font-semibold text-slate-800">
                  {ONBOARDING_STEPS.find((x) => x.id === s.id)!.label}
                  {incomplete && <span className="ml-2 font-normal text-red-600">Incomplete</span>}
                </p>
                <button type="button" onClick={() => onEdit(s.id)} className="text-[12px] font-medium text-[#0C447C] hover:underline">
                  Edit
                </button>
              </div>
              <dl className="divide-y divide-slate-100">
                {s.rows.map(([k, v]) => (
                  <div key={k} className="flex gap-4 px-4 py-2 text-[12px]">
                    <dt className="w-32 shrink-0 text-slate-800">{k}</dt>
                    <dd className="min-w-0 break-words text-slate-950">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
