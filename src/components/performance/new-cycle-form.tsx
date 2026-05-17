'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { buildCycleName, type Cadence } from '@/types/review';
import { createCycleAction } from '@/app/(app)/performance/actions';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface Props {
  defaultYear: number;
  defaultMonth: number;
  defaultQuarter: number;
}

export function NewCycleForm({ defaultYear, defaultMonth, defaultQuarter }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [month, setMonth] = useState<number>(defaultMonth);
  const [quarter, setQuarter] = useState<number>(defaultQuarter);
  const [year, setYear] = useState<number>(defaultYear);
  const [error, setError] = useState<string | null>(null);

  const previewName = useMemo(
    () =>
      buildCycleName({
        cadence,
        month: cadence === 'monthly' ? month : null,
        quarter: cadence === 'quarterly' ? quarter : null,
        year,
      }),
    [cadence, month, quarter, year]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCycleAction({
        cadence,
        month: cadence === 'monthly' ? month : null,
        quarter: cadence === 'quarterly' ? quarter : null,
        year,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/performance/cycles/${res.data.cycleId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Cycle details</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Cadence" required>
            <Select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </Field>
          <Field label="Year" required>
            <Input
              type="number"
              min={2024}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || defaultYear)}
              required
            />
          </Field>
          {cadence === 'monthly' ? (
            <Field label="Month" required className="sm:col-span-2">
              <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Quarter" required className="sm:col-span-2">
              <Select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    Q{q}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </CardBody>
      </Card>

      <div className="rounded-md border border-default bg-card px-4 py-3 text-sm">
        Cycle name will be <span className="font-medium">{previewName}</span>.
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create cycle'}
        </Button>
      </div>
    </form>
  );
}
