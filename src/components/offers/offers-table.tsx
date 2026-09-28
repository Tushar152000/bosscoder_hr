'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Lock, Search, Unlock, X } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import type { OfferListItem } from '@/lib/firestore/offer-letters';

interface Props {
  offers: OfferListItem[];
}

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'full-time', label: 'Full Time' },
  { value: 'internship', label: 'Internship' },
  { value: 'relieving', label: 'Relieving letter' },
  { value: 'experience', label: 'Experience letter' },
] as const;

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function editHrefBase(templateKey: OfferListItem['templateKey']): string {
  if (templateKey === 'relieving') return '/offers/relieving';
  if (templateKey === 'experience') return '/offers/experience';
  return '/offers';
}

function typeLabel(o: OfferListItem): string {
  if (o.templateKey === 'relieving') return 'Relieving letter';
  if (o.templateKey === 'experience') return 'Experience letter';
  return o.employmentType.replace('-', ' ');
}

function matchesTypeFilter(o: OfferListItem, value: string): boolean {
  if (!value) return true;
  if (value === 'relieving') return o.templateKey === 'relieving';
  if (value === 'experience') return o.templateKey === 'experience';
  if (value === 'internship') return o.employmentType === 'internship';
  if (value === 'full-time') {
    return (
      o.employmentType === 'full-time' &&
      o.templateKey !== 'relieving' &&
      o.templateKey !== 'experience'
    );
  }
  return true;
}

const PAGE_SIZE = 20;

export function OffersTable({ offers }: Props) {
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const departments = useMemo(
    () => [...new Set(offers.map((o) => o.department).filter(Boolean))].sort(),
    [offers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offers.filter(
      (o) =>
        (!department || o.department === department) &&
        matchesTypeFilter(o, type) &&
        (!q ||
          o.candidateName.toLowerCase().includes(q) ||
          o.candidateEmail.toLowerCase().includes(q))
    );
  }, [offers, department, type, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  if (offers.length === 0) {
    return (
      <Card>
        <CardBody className="text-sm text-muted">
          No offer letters yet.{' '}
          <Link href="/offers/new" className="text-[#0C447C] hover:underline">
            Create the first one →
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateFilter(() => setSearch(e.target.value))}
            placeholder="Search by name or email…"
            className="h-9 w-56 rounded-md border border-default bg-card pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-[#0C447C]"
          />
        </div>
        <Select
          value={department}
          onChange={(e) => updateFilter(() => setDepartment(e.target.value))}
          className="h-9 w-fit text-slate-900"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select
          value={type}
          onChange={(e) => updateFilter(() => setType(e.target.value))}
          className="h-9 w-fit text-slate-900"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        {(department || type || search) && (
          <button
            type="button"
            onClick={() =>
              updateFilter(() => {
                setDepartment('');
                setType('');
                setSearch('');
              })
            }
            aria-label="Clear filters"
            title="Clear filters"
            className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <span className="text-xs text-muted">
          {filtered.length} of {offers.length} {offers.length === 1 ? 'letter' : 'letters'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-muted">No letters match these filters.</CardBody>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-default bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Joining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => (
                <tr key={o.offerId} className="border-t border-default hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`${editHrefBase(o.templateKey)}/${o.offerId}`}
                      className="block font-medium text-slate-900 hover:underline"
                    >
                      {o.candidateName}
                    </Link>
                    <div className="text-xs text-muted">{o.designation}</div>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{typeLabel(o)}</td>
                  <td className="px-4 py-3 text-xs">{o.department || '—'}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(parseDate(o.joiningDate))}</td>
                  <td className="px-4 py-3">
                    {o.status === 'finalized' ? (
                      <Badge variant="success" className="gap-1">
                        <Lock className="h-3 w-3" /> Finalized
                      </Badge>
                    ) : o.status === 'archived' ? (
                      <Badge variant="muted">Archived</Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1">
                        <Unlock className="h-3 w-3" /> Draft
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(o.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-default px-4 py-2.5">
              <span className="text-xs text-muted">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
