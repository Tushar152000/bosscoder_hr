'use client';

import { useMemo, useState } from 'react';
import { Search, Download, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfferPreview } from '@/components/offers/offer-preview';
import { downloadOfferPdf, safeFilename } from '@/lib/offers/pdf-export';
import type { OfferData } from '@/types/offer';

export interface QuickEmployee {
  employeeId: string;
  displayName: string;
  department: string;
  designation: string;
  email: string;
}

interface Props {
  employees: QuickEmployee[];
  backgroundUrl: string;
  /** Pre-filled letter body (e.g. a relieving-letter template). */
  starterBody?: string;
  /** Prefix for the downloaded PDF filename. */
  filenamePrefix?: string;
}

const STARTER = `This is to inform you that…

Write the letter content here. You can use placeholders that fill from the selected employee:
- {{candidateName}} — full name
- {{designation}} — role
- {{department}} — department
- {{offerDate}} — today's date`;

export function QuickLetterEditor({
  employees,
  backgroundUrl,
  starterBody = STARTER,
  filenamePrefix = 'bosscoder-letter',
}: Props) {
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<QuickEmployee | null>(null);
  const [body, setBody] = useState(starterBody);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => (!dept || e.department === dept) && (!q || e.displayName.toLowerCase().includes(q)))
      .slice(0, 50);
  }, [employees, dept, search]);

  const today = new Date().toISOString().slice(0, 10);

  const data: OfferData = useMemo(
    () => ({
      candidateName: selected?.displayName ?? '',
      candidateEmail: selected?.email ?? '',
      candidatePhone: '',
      employmentType: 'full-time',
      department: selected?.department ?? '',
      templateKey: 'other-dept',
      designation: selected?.designation ?? '',
      offerDate: today,
      joiningDate: today,
      annualBaseCtc: 0,
      annualVariableCtc: 0,
      variableRateText: '',
      includePf: false,
      pfAmountMonthly: 1800,
      includeBstIncentives: false,
      probationMonths: 0,
      internshipDurationMonths: 0,
      pocName: '',
      pocDesignation: '',
      pocEmail: '',
      bodyMarkdown: body,
    }),
    [selected, body, today],
  );

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    const namePart = safeFilename(selected?.displayName ?? 'letter');
    const result = await downloadOfferPdf({ filename: `${filenamePrefix}-${namePart}-${today}` });
    setDownloading(false);
    if (!result.ok) setError(result.error ?? 'Failed to generate PDF');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] h-full overflow-hidden">
      {/* ── Left: pick employee + write ───────────────────────────── */}
      <div className="no-print flex flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4">
        {/* Step 1 — employee */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            1 · Select employee
          </p>

          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#B5D4F4] bg-[#EBF3FE] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900">{selected.displayName}</p>
                <p className="truncate text-[11px] text-slate-500">{selected.designation} · {selected.department}</p>
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
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
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
                      onClick={() => { setSelected(e); setSearch(''); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#F5F8FF]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-slate-800">{e.displayName}</p>
                        <p className="truncate text-[11px] text-slate-400">{e.designation} · {e.department}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2 — text */}
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            2 · Letter content
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type the letter text here… (Markdown supported)"
            className="min-h-[280px] flex-1 w-full resize-none rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-800 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/15"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Supports Markdown (**bold**, lists, tables) and {'{{candidateName}}'}, {'{{designation}}'}, {'{{offerDate}}'} placeholders.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-[#FAC8C6] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#993C1D]">{error}</p>
        )}

        <Button
          type="button"
          variant="primary"
          onClick={handleDownload}
          isLoading={downloading}
          disabled={downloading || !body.trim()}
          className="w-full gap-2 h-10"
        >
          {!downloading && <Download className="h-4 w-4" />}
          Download PDF
        </Button>
      </div>

      {/* ── Right: live letterhead preview ────────────────────────── */}
      <div className="overflow-y-auto bg-[#F1F5F9] p-4 sm:p-6">
        {!selected && !body.trim() ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <FileText className="h-8 w-8" />
            <p className="mt-2 text-[13px]">Select an employee and start typing</p>
          </div>
        ) : (
          <OfferPreview data={data} backgroundUrl={backgroundUrl} />
        )}
      </div>
    </div>
  );
}
