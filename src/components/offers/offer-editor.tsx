'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Printer, Save, Lock, Unlock, Trash2, RotateCcw, Download,
  Layers, UserRound, CalendarDays, IndianRupee, Contact, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useDialog } from '@/components/ui/modal';
import { OfferPreview } from '@/components/offers/offer-preview';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { defaultBodyFor, templateKeyForDepartment } from '@/lib/offers/templates';
import { formatINR } from '@/lib/offers/render';
import { downloadOfferPdf, safeFilename } from '@/lib/offers/pdf-export';
import {
  createOfferAction,
  deleteOfferAction,
  finalizeOfferAction,
  updateOfferAction,
} from '@/app/(app)/offers/actions';
import type { OfferData, OfferStatus, TemplateKey } from '@/types/offer';

interface Props {
  offerId?: string;
  initial: OfferData;
  status: OfferStatus;
  backgroundUrl: string;
  pocOptions: { name: string; designation: string; email: string }[];
}

const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  'sales-ops': 'Sales / Operations format',
  'other-dept': 'Other departments format',
  intern: 'Internship format',
};

export function OfferEditor({
  offerId,
  initial,
  status,
  backgroundUrl,
  pocOptions,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<OfferData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [bodyTouched, setBodyTouched] = useState(false);
  const { confirm, promptText, dialog } = useDialog();

  const isFinalized = status === 'finalized';
  const readOnly = isFinalized;
  const isFullTime = data.employmentType === 'full-time';
  const isIntern = data.employmentType === 'internship';
  const isSalesOps = data.templateKey === 'sales-ops';
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    const namePart = safeFilename(data.candidateName);
    const datePart = data.offerDate || new Date().toISOString().slice(0, 10);
    const result = await downloadOfferPdf({
      filename: `bosscoder-offer-${namePart}-${datePart}`,
    });
    setDownloading(false);
    if (!result.ok) {
      setError(result.error ?? 'Failed to generate PDF');
    }
  }

  // Auto-pick template when department or employment type changes.
  useEffect(() => {
    const auto: TemplateKey =
      data.employmentType === 'internship'
        ? 'intern'
        : data.department
        ? templateKeyForDepartment(data.department)
        : data.templateKey;
    if (auto !== data.templateKey) {
      setData((d) => ({ ...d, templateKey: auto }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.employmentType, data.department]);

  // Pre-fill body from template on first mount when empty.
  useEffect(() => {
    if (!data.bodyMarkdown.trim()) {
      setData((d) => ({ ...d, bodyMarkdown: defaultBodyFor(d.templateKey) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof OfferData>(key: K, value: OfferData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (key === 'bodyMarkdown') setBodyTouched(true);
  }

  async function resetBodyToTemplate() {
    if (bodyTouched) {
      const ok = await confirm({
        title: 'Reset letter body?',
        body: 'Your edits to the letter body will be replaced with the default template for this format.',
        confirmLabel: 'Reset',
      });
      if (!ok) return;
    }
    setData((d) => ({ ...d, bodyMarkdown: defaultBodyFor(d.templateKey) }));
    setBodyTouched(false);
  }

  function save(thenFinalize = false) {
    setError(null);
    startTransition(async () => {
      const res = offerId
        ? await updateOfferAction(offerId, data)
        : await createOfferAction(data);
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
      }

      if (!offerId && finalId) {
        router.push(`/offers/${finalId}`);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  async function deleteOffer() {
    if (!offerId) return;
    const result = await promptText({
      title: `Delete offer for ${data.candidateName}?`,
      body: 'This permanently removes the offer letter. This cannot be undone.',
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
  const pfAnnual = data.includePf ? (data.pfAmountMonthly || 0) * 2 * 12 : 0;
  const totalCtcPreview = data.annualBaseCtc + pfAnnual + data.annualVariableCtc;

  return (
    <div className="flex h-full flex-col bg-[#FAFAF7]">
      {dialog}
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-default bg-white/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {offerId ? 'Edit offer letter' : 'New offer letter'}
          </span>
          <StatusPill status={status} />
          {savedAt && !pending && (
            <span className="text-xs text-muted">
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetBodyToTemplate}
              disabled={pending}
              title="Reset the body to the default template"
            >
              <RotateCcw className="h-4 w-4" />
              Reset body
            </Button>
          )}
          <Button
            size="sm"
            onClick={downloadPdf}
            disabled={pending || downloading}
            title="Generate a PDF that matches the live preview exactly"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Generating PDF…' : 'Download PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={pending || downloading}
            title="Use the browser's print dialog (fallback)"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => save(false)} disabled={pending}>
              <Save className="h-4 w-4" />
              {pending ? 'Saving…' : 'Save draft'}
            </Button>
          )}
          {canFinalize && (
            <Button
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Finalize this offer?',
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
            <Button
              variant="danger"
              size="sm"
              onClick={deleteOffer}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="no-print mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(380px,440px)_1fr]">
        {/* Left: form */}
        <div className="no-print overflow-y-auto border-r border-default bg-gray-50 p-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4 text-[#0C447C]" />Type & template</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <Field label="Employment type" required>
                  <Select
                    value={data.employmentType}
                    onChange={(e) =>
                      set('employmentType', e.target.value as OfferData['employmentType'])
                    }
                    disabled={readOnly}
                  >
                    <option value="full-time">Full Time</option>
                    <option value="internship">Internship</option>
                  </Select>
                </Field>

                {isFullTime && (
                  <Field label="Department" required>
                    <Select
                      value={data.department}
                      onChange={(e) => set('department', e.target.value)}
                      disabled={readOnly}
                      required
                    >
                      <option value="" disabled>
                        Select a department…
                      </option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <span className="rounded-full bg-[#EBF3FE] px-2 py-0.5 font-medium text-[#0C447C]">Format</span>
                  <span className="font-medium text-slate-800">{TEMPLATE_LABEL[data.templateKey]}</span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#0C447C]" />Candidate</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <Field label="Full name" required>
                  <Input
                    value={data.candidateName}
                    onChange={(e) => set('candidateName', e.target.value)}
                    placeholder="e.g. Aman Srivastava"
                    disabled={readOnly}
                    required
                  />
                </Field>
                <Field label="Designation in offer" required>
                  <Input
                    value={data.designation}
                    onChange={(e) => set('designation', e.target.value)}
                    placeholder="e.g. Sr. Business Development Associate"
                    disabled={readOnly}
                    required
                  />
                </Field>
                <Field label="Candidate email" hint="Stored encrypted">
                  <Input
                    type="email"
                    value={data.candidateEmail}
                    onChange={(e) => set('candidateEmail', e.target.value)}
                    placeholder="name@example.com"
                    disabled={readOnly}
                  />
                </Field>
                <Field label="Candidate phone" hint="Stored encrypted">
                  <Input
                    type="tel"
                    value={data.candidatePhone}
                    onChange={(e) => set('candidatePhone', e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={readOnly}
                  />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#0C447C]" />Dates & tenure</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <Field label="Offer date" required>
                  <Input
                    type="date"
                    value={data.offerDate}
                    onChange={(e) => set('offerDate', e.target.value)}
                    disabled={readOnly}
                    required
                  />
                </Field>
                <Field label="Joining date" required>
                  <Input
                    type="date"
                    value={data.joiningDate}
                    onChange={(e) => set('joiningDate', e.target.value)}
                    disabled={readOnly}
                    required
                  />
                </Field>
                {isFullTime ? (
                  <Field label="Probation period (months)" required>
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      value={data.probationMonths}
                      onChange={(e) =>
                        set('probationMonths', Number(e.target.value) || 0)
                      }
                      disabled={readOnly}
                    />
                  </Field>
                ) : (
                  <Field label="Internship duration (months)" required>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={data.internshipDurationMonths}
                      onChange={(e) =>
                        set('internshipDurationMonths', Number(e.target.value) || 0)
                      }
                      disabled={readOnly}
                    />
                  </Field>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-[#0C447C]" />Compensation</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {isIntern ? (
                  <Field
                    label="Annual stipend (₹)"
                    required
                    hint={`Monthly stipend = ₹${formatINR(
                      data.annualBaseCtc / 12
                    )}. Enter the annual amount; the letter shows it per month automatically.`}
                  >
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={data.annualBaseCtc || ''}
                      onChange={(e) => set('annualBaseCtc', Number(e.target.value) || 0)}
                      placeholder="180000"
                      disabled={readOnly}
                      required
                    />
                  </Field>
                ) : (
                  <>
                    <Field
                      label="Annual Base CTC (₹)"
                      required
                      hint={`Monthly base = ₹${formatINR(
                        data.annualBaseCtc / 12
                      )}. Salary table auto-splits into Basic / HRA / Special / LTA.`}
                    >
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={data.annualBaseCtc || ''}
                        onChange={(e) =>
                          set('annualBaseCtc', Number(e.target.value) || 0)
                        }
                        placeholder="1200000"
                        disabled={readOnly}
                        required
                      />
                    </Field>

                    {isSalesOps && (
                      <>
                        <Field
                          label="Annual Variable CTC (₹)"
                          hint="Set to 0 if there's no variable component. Adds Variable + Total CTC rows."
                        >
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={data.annualVariableCtc || ''}
                            onChange={(e) =>
                              set('annualVariableCtc', Number(e.target.value) || 0)
                            }
                            placeholder="360000"
                            disabled={readOnly}
                          />
                        </Field>
                        <Field
                          label="Variable rate text (optional)"
                          hint='Free text for the opening line, e.g. "0.75% variable" or "30% commission".'
                        >
                          <Input
                            value={data.variableRateText}
                            onChange={(e) => set('variableRateText', e.target.value)}
                            placeholder="0.75% variable"
                            disabled={readOnly}
                          />
                        </Field>
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={data.includePf}
                          onChange={(e) => set('includePf', e.target.checked)}
                          disabled={readOnly}
                          className="mt-0.5 h-4 w-4 rounded border-default accent-[#0C447C]"
                        />
                        <span>
                          Include PF in salary table
                          <span className="block text-xs text-muted">
                            Adds Employer&apos;s + Employee&apos;s PF rows. Statutory default
                            is ₹1,800/mo each — override below if needed.
                          </span>
                        </span>
                      </label>
                      {data.includePf && (
                        <Field
                          label="PF amount per month per side (₹)"
                          hint={`Annual per side = ₹${formatINR(
                            (data.pfAmountMonthly || 0) * 12
                          )}. Same value used for both employer's and employee's contribution.`}
                          className="ml-6"
                        >
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={data.pfAmountMonthly || ''}
                            onChange={(e) =>
                              set('pfAmountMonthly', Number(e.target.value) || 0)
                            }
                            placeholder="1800"
                            disabled={readOnly}
                          />
                        </Field>
                      )}
                    </div>

                    {isSalesOps && (
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={data.includeBstIncentives}
                          onChange={(e) =>
                            set('includeBstIncentives', e.target.checked)
                          }
                          disabled={readOnly}
                          className="mt-0.5 h-4 w-4 rounded border-default accent-[#0C447C]"
                        />
                        <span>
                          BST Sales — performance-based incentives addendum
                          <span className="block text-xs text-muted">
                            Appends the registration-based incentive structure (₹100/reg, ₹7k/₹10k/₹12k tiers, etc.).
                          </span>
                        </span>
                      </label>
                    )}

                    <div className="rounded-lg border border-[#B5D4F4] bg-[#EBF3FE] px-3.5 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[#0C447C]">Total CTC preview</span>
                        <span className="text-[16px] font-bold tabular-nums text-[#0C447C]">
                          ₹{formatINR(totalCtcPreview)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span>Base ₹{formatINR(data.annualBaseCtc)}</span>
                        {data.annualVariableCtc > 0 && <span>· Variable ₹{formatINR(data.annualVariableCtc)}</span>}
                        {data.includePf && <span>· PF ₹{formatINR(pfAnnual)}</span>}
                      </div>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Contact className="h-4 w-4 text-[#0C447C]" />Point of contact</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <Field label="POC name" required>
                  <Select
                    value={
                      pocOptions.some((p) => p.name === data.pocName)
                        ? data.pocName
                        : '__custom__'
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__custom__') return;
                      const match = pocOptions.find((p) => p.name === v);
                      if (match) {
                        set('pocName', match.name);
                        set('pocDesignation', match.designation);
                        set('pocEmail', match.email);
                      }
                    }}
                    disabled={readOnly}
                  >
                    {pocOptions.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    <option value="__custom__">Custom…</option>
                  </Select>
                </Field>
                <Field label="POC designation">
                  <Input
                    value={data.pocDesignation}
                    onChange={(e) => set('pocDesignation', e.target.value)}
                    disabled={readOnly}
                  />
                </Field>
                <Field label="POC email">
                  <Input
                    type="email"
                    value={data.pocEmail}
                    onChange={(e) => set('pocEmail', e.target.value)}
                    disabled={readOnly}
                    placeholder="charvi.madaan@bosscoderacademy.com"
                  />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#0C447C]" />Letter body</CardTitle>
                  <span className="text-xs text-muted">Markdown · live preview →</span>
                </div>
              </CardHeader>
              <CardBody>
                <Textarea
                  rows={18}
                  value={data.bodyMarkdown}
                  onChange={(e) => set('bodyMarkdown', e.target.value)}
                  className="font-mono text-xs leading-relaxed"
                  spellCheck={false}
                  disabled={readOnly}
                />
                <p className="mt-2 text-xs text-muted">
                  Placeholders: <code>{'{{candidateName}}'}</code>, <code>{'{{offerDate}}'}</code>,{' '}
                  <code>{'{{joiningDate}}'}</code>, <code>{'{{baseCtcText}}'}</code>,{' '}
                  <code>{'{{baseMonthlyText}}'}</code>, <code>{'{{variableCtcText}}'}</code>,{' '}
                  <code>{'{{designation}}'}</code>, <code>{'{{department}}'}</code>,{' '}
                  <code>{'{{probationMonths}}'}</code>,{' '}
                  <code>{'{{internshipDurationMonths}}'}</code>, <code>{'{{pocName}}'}</code>,{' '}
                  <code>{'{{pocDesignation}}'}</code>, <code>{'{{pocEmail}}'}</code>,{' '}
                  <code>{'{{salaryTable}}'}</code>. Conditionals:{' '}
                  <code>{'{{#if hasVariable}} … {{/if}}'}</code>,{' '}
                  <code>{'{{#if includeBstIncentives}} … {{/if}}'}</code>.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Right: live A4 preview */}
        <div className="overflow-y-auto bg-slate-100 px-6 py-8 print:overflow-visible print:bg-white print:p-0">
          <OfferPreview data={data} backgroundUrl={backgroundUrl} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: OfferStatus }) {
  if (status === 'finalized')
    return (
      <Badge variant="success" className="gap-1">
        <Lock className="h-3 w-3" /> Finalized
      </Badge>
    );
  if (status === 'archived') return <Badge variant="muted">Archived</Badge>;
  return (
    <Badge variant="warning" className="gap-1">
      <Unlock className="h-3 w-3" /> Draft
    </Badge>
  );
}
