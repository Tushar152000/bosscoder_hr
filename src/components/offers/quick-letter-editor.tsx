'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Search, Download, FileText, X, Save, Lock, Unlock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDialog } from '@/components/ui/modal';
import { OfferPreview } from '@/components/offers/offer-preview';
import {
  downloadOfferPdf,
  generateOfferPdfBase64,
  safeFilename,
} from '@/lib/offers/pdf-export';
import { formatDateLong } from '@/lib/offers/render';
import {
  createOfferAction,
  deleteOfferAction,
  finalizeOfferAction,
  sendOfferEmailAction,
  updateOfferAction,
} from '@/app/(app)/offers/actions';
import type { OfferData, OfferStatus, TemplateKey } from '@/types/offer';

export interface QuickEmployee {
  employeeId: string;
  displayName: string;
  department: string;
  designation: string;
  email: string;
  joiningDate?: string;
}

/** A `{{key}}` placeholder in the body that the user fills via a date picker.
 *  Only used before the letter is first saved — once saved, the substituted
 *  text is baked into bodyMarkdown and edited as plain text from then on. */
export interface DateField {
  key: string;
  label: string;
}

interface Props {
  employees: QuickEmployee[];
  backgroundUrl: string;
  templateKey: TemplateKey;
  /** Pre-filled letter body for a brand-new letter (e.g. a relieving-letter template). */
  starterBody: string;
  /** Prefix for the downloaded PDF filename. */
  filenamePrefix: string;
  /** Optional date pickers; each fills its `{{key}}` placeholder in the body
   *  before the first save. Ignored once editing an existing letter. */
  dateFields?: DateField[];
  /** Top-bar title shown next to the Download button. */
  title: string;
  /** Route prefix used to build the URL to redirect to after first save,
   *  e.g. "/offers/relieving" → redirects to /offers/relieving/{newId}. */
  editBasePath: string;
  backHref?: string;
  backLabel?: string;
  /** Present when editing an existing, already-saved letter. */
  offerId?: string;
  initial?: OfferData;
  status?: OfferStatus;
}

function substituteDates(
  body: string,
  dateFields: DateField[],
  dateValues: Record<string, string>
): string {
  let out = body;
  for (const f of dateFields) {
    const v = dateValues[f.key];
    const replacement = v ? formatDateLong(v) : `[${f.label}]`;
    out = out.split(`{{${f.key}}}`).join(replacement);
  }
  return out;
}

export function QuickLetterEditor({
  employees,
  backgroundUrl,
  templateKey,
  starterBody,
  filenamePrefix,
  dateFields = [],
  title,
  editBasePath,
  backHref = '/offers',
  backLabel = 'Back to letters',
  offerId,
  initial,
  status,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { confirm, promptText, dialog } = useDialog();

  const isEditing = !!offerId;
  const isFinalized = status === 'finalized';
  const readOnly = isFinalized;

  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<QuickEmployee | null>(null);
  const [dateValues, setDateValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [downloading, setDownloading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const [data, setData] = useState<OfferData>(
    () =>
      initial ?? {
        candidateName: '',
        candidateEmail: '',
        candidatePhone: '',
        employmentType: 'full-time',
        department: '',
        templateKey,
        designation: '',
        offerDate: today,
        joiningDate: today,
        annualBaseCtc: 0,
        annualVariableCtc: 0,
        variableRateText: '',
        includePf: false,
        pfAmountMonthly: 0,
        includeBstIncentives: false,
        probationMonths: 0,
        internshipDurationMonths: 0,
        pocName: '',
        pocDesignation: '',
        pocEmail: '',
        bodyMarkdown: starterBody,
      }
  );

  function set<K extends keyof OfferData>(key: K, value: OfferData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // Pre-save convenience: picking an employee fills name/email/dept/designation.
  useEffect(() => {
    if (!selected) return;
    setData((d) => ({
      ...d,
      candidateName: selected.displayName,
      candidateEmail: selected.email,
      department: selected.department,
      designation: selected.designation,
      joiningDate: selected.joiningDate || d.joiningDate,
    }));
  }, [selected]);

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => (!dept || e.department === dept) && (!q || e.displayName.toLowerCase().includes(q)))
      .slice(0, 50);
  }, [employees, dept, search]);

  // Before the first save, custom {{key}} date placeholders are substituted
  // live for preview only — the raw template (with placeholders) stays in
  // `data.bodyMarkdown` until save time, when it gets baked in permanently.
  const previewData = useMemo(() => {
    if (isEditing) return data;
    return { ...data, bodyMarkdown: substituteDates(data.bodyMarkdown, dateFields, dateValues) };
  }, [data, isEditing, dateFields, dateValues]);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    const namePart = safeFilename(data.candidateName || 'letter');
    const result = await downloadOfferPdf({
      filename: `${filenamePrefix}-${namePart}-${data.offerDate || today}`,
    });
    setDownloading(false);
    if (!result.ok) setError(result.error ?? 'Failed to generate PDF');
  }

  async function maybeSendEmail(id: string, candidateEmail: string) {
    if (!candidateEmail) return;
    const wantsToSend = await confirm({
      title: 'Send this letter by email?',
      body: `This will email the finalized letter as a PDF to ${candidateEmail}.`,
      confirmLabel: 'Send email',
      cancelLabel: 'Not now',
    });
    if (!wantsToSend) return;

    const toastId = toast.loading('Generating PDF and sending email…');
    const pdfResult = await generateOfferPdfBase64({});
    if (!pdfResult.ok || !pdfResult.base64) {
      toast.error(pdfResult.error ?? 'Failed to generate PDF', { id: toastId });
      return;
    }
    const sendResult = await sendOfferEmailAction(id, pdfResult.base64);
    if (!sendResult.ok) {
      toast.error(sendResult.error, { id: toastId });
      return;
    }
    toast.success(`Letter emailed to ${candidateEmail}`, { id: toastId });
  }

  function save(thenFinalize = false) {
    setError(null);
    const toSave: OfferData = isEditing
      ? data
      : { ...data, templateKey, bodyMarkdown: substituteDates(data.bodyMarkdown, dateFields, dateValues) };

    if (!toSave.candidateName.trim()) {
      setError('Select or enter a name first');
      return;
    }

    startTransition(async () => {
      const res = offerId ? await updateOfferAction(offerId, toSave) : await createOfferAction(toSave);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(new Date());

      let finalId: string | undefined = offerId;
      if (!offerId) {
        const created = res as { ok: boolean; data?: { offerId: string } };
        finalId = created.data?.offerId;
      }
      if (thenFinalize && finalId) {
        const finRes = await finalizeOfferAction(finalId);
        if (!finRes.ok) {
          setError(finRes.error);
          return;
        }
        await maybeSendEmail(finalId, toSave.candidateEmail);
      }

      if (!offerId && finalId) {
        router.push(`${editBasePath}/${finalId}`);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  async function deleteLetter() {
    if (!offerId) return;
    const result = await promptText({
      title: `Delete letter for ${data.candidateName}?`,
      body: 'This permanently removes the letter. This cannot be undone.',
      expected: 'DELETE',
      confirmLabel: 'Delete permanently',
      intent: 'danger',
    });
    if (result !== 'DELETE') return;
    startTransition(async () => {
      const res = await deleteOfferAction(offerId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push('/offers');
      router.refresh();
    });
  }

  const canFinalize = !!offerId && !isFinalized && !pending;

  return (
    <div className="flex h-full flex-col print:h-auto">
      {dialog}
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            isFinalized ? (
              <Badge variant="success" className="gap-1">
                <Lock className="h-3 w-3" /> Finalized
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <Unlock className="h-3 w-3" /> Draft
              </Badge>
            )
          )}
          {savedAt && !pending && (
            <span className="text-xs text-muted">Saved {savedAt.toLocaleTimeString()}</span>
          )}
          {error && <span className="max-w-[240px] truncate text-[12px] text-[#993C1D]">{error}</span>}
          <span className="hidden text-sm font-semibold text-slate-700 sm:inline">{title}</span>
          <Button
            type="button"
            variant="outline"
            onClick={downloadPdf}
            disabled={downloading || !data.bodyMarkdown.trim()}
            className="gap-2 h-9"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Generating…' : 'Download PDF'}
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => save(false)} disabled={pending} className="gap-2 h-9">
              <Save className="h-4 w-4" />
              {pending ? 'Saving…' : 'Save draft'}
            </Button>
          )}
          {canFinalize && (
            <Button
              size="sm"
              className="gap-2 h-9"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Finalize this letter?',
                  body: 'It will be marked as final and become read-only. You can still download the PDF afterwards.',
                  confirmLabel: 'Finalize',
                });
                if (ok) save(true);
              }}
              disabled={pending}
            >
              <Lock className="h-4 w-4" />
              Finalize
            </Button>
          )}
          {offerId && (
            <Button variant="danger" size="sm" onClick={deleteLetter} disabled={pending} className="gap-2 h-9">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] flex-1 overflow-hidden">
        {/* ── Left: employee / fields + body ─────────────────────────── */}
        <div className="no-print flex flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4">
          {!isEditing ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1 · Select employee
              </p>

              {selected ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#B5D4F4] bg-[#EBF3FE] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{selected.displayName}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {selected.designation} · {selected.department}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-slate-600"
                    aria-label="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <select
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-[#0C447C]"
                  >
                    <option value="">All departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search employee by name…"
                      className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white pl-8 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#0C447C]"
                    />
                  </div>

                  <div className="max-h-[260px] divide-y divide-[#F1F5F9] overflow-y-auto rounded-lg border border-[#E2E8F0]">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-4 text-center text-[12px] text-slate-400">No employees match.</p>
                    ) : (
                      filtered.map((e) => (
                        <button
                          key={e.employeeId}
                          type="button"
                          onClick={() => {
                            setSelected(e);
                            setSearch('');
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#F5F8FF]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-slate-800">{e.displayName}</p>
                            <p className="truncate text-[11px] text-slate-400">
                              {e.designation} · {e.department}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Employee details
              </p>
              <div className="space-y-3">
                <Field label="Name">
                  <Input value={data.candidateName} onChange={(e) => set('candidateName', e.target.value)} disabled={readOnly} />
                </Field>
                <Field label="Email" hint="Used to send the letter">
                  <Input
                    type="email"
                    value={data.candidateEmail}
                    onChange={(e) => set('candidateEmail', e.target.value)}
                    disabled={readOnly}
                  />
                </Field>
                <Field label="Designation">
                  <Input value={data.designation} onChange={(e) => set('designation', e.target.value)} disabled={readOnly} />
                </Field>
                <Field label="Department">
                  <Input value={data.department} onChange={(e) => set('department', e.target.value)} disabled={readOnly} />
                </Field>
              </div>
            </div>
          )}

          <Field label="Issue date">
            <Input
              type="date"
              value={data.offerDate}
              onChange={(e) => set('offerDate', e.target.value)}
              disabled={readOnly}
            />
          </Field>
          <Field label="Joining date">
            <Input
              type="date"
              value={data.joiningDate}
              onChange={(e) => set('joiningDate', e.target.value)}
              disabled={readOnly}
            />
          </Field>

          {/* Custom date placeholders — only relevant before the first save */}
          {!isEditing && dateFields.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">2 · Dates</p>
              <div className="grid grid-cols-2 gap-2">
                {dateFields.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium capitalize text-slate-600">{f.label}</span>
                    <input
                      type="date"
                      value={dateValues[f.key] ?? ''}
                      onChange={(e) => setDateValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="h-9 w-full rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-[#0C447C]"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {!isEditing && dateFields.length > 0 ? '3' : '2'} · Letter content
            </p>
            <textarea
              value={data.bodyMarkdown}
              onChange={(e) => set('bodyMarkdown', e.target.value)}
              placeholder="Type the letter text here… (Markdown supported)"
              disabled={readOnly}
              className="min-h-[280px] flex-1 w-full resize-none rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-800 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/15 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Supports Markdown (**bold**, lists, tables) and {'{{candidateName}}'}, {'{{designation}}'},{' '}
              {'{{department}}'}, {'{{offerDate}}'}, {'{{joiningDate}}'} placeholders.
            </p>
          </div>
        </div>

        {/* ── Right: live letterhead preview ────────────────────────── */}
        <div className="overflow-y-auto bg-[#F1F5F9] p-4 sm:p-6">
          {!isEditing && !selected && !data.bodyMarkdown.trim() ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <FileText className="h-8 w-8" />
              <p className="mt-2 text-[13px]">Select an employee and start typing</p>
            </div>
          ) : (
            <OfferPreview data={previewData} backgroundUrl={backgroundUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
