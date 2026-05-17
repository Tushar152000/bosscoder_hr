'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  type EmployeeInput,
  type EmployeePublic,
} from '@/types/employee';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { createEmployeeAction, updateEmployeeAction } from '@/app/(app)/directory/actions';

interface Props {
  mode: 'create' | 'edit';
  initial: EmployeeInput;
  employeeId?: string;
  managers: { employeeId: string; displayName: string; designation: string }[];
  canEditSensitive: boolean;
}

export function EmployeeForm({ mode, initial, employeeId, managers, canEditSensitive }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<EmployeeInput>(initial);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setNested<G extends 'compensation' | 'bank' | 'identity' | 'address' | 'emergencyContact'>(
    group: G,
    key: keyof EmployeeInput[G],
    value: string | null
  ) {
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value || null } }));
  }
  function setPhone(value: string) {
    setForm((f) => ({ ...f, phone: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createEmployeeAction(form)
          : await updateEmployeeAction(employeeId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/directory/${result.employeeId}`);
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
          <CardTitle>Basic info</CardTitle>
          <CardDescription>Public fields visible to anyone signed in.</CardDescription>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} required />
          </Field>
          <Field label="Work email" required hint="Must be @bosscoderacademy.com to sign in">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </Field>
          <Field label="Designation" required>
            <Input value={form.designation} onChange={(e) => set('designation', e.target.value)} required />
          </Field>
          <Field label="Department" required>
            <Select
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
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
          <Field label="Personal email">
            <Input
              type="email"
              value={form.personalEmail ?? ''}
              onChange={(e) => set('personalEmail', e.target.value || null)}
            />
          </Field>
          <Field label="Mobile" required hint="Used for cycle-opening notifications later.">
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              required
              minLength={7}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Employment type" required>
            <Select
              value={form.employmentType}
              onChange={(e) => set('employmentType', e.target.value as EmployeeInput['employmentType'])}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" required>
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value as EmployeeInput['status'])}
            >
              {EMPLOYEE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Joining date" required>
            <Input
              type="date"
              value={form.joiningDate}
              onChange={(e) => set('joiningDate', e.target.value)}
              required
            />
          </Field>
          <Field label="Exit date" hint="Only if status = on-notice or left">
            <Input
              type="date"
              value={form.exitDate ?? ''}
              onChange={(e) => set('exitDate', e.target.value || null)}
            />
          </Field>
          <Field label="Manager" hint="Sets up the org tree" className="sm:col-span-2">
            <Select
              value={form.managerId ?? ''}
              onChange={(e) => set('managerId', e.target.value || null)}
            >
              <option value="">— No manager —</option>
              {managers
                .filter((m) => m.employeeId !== employeeId)
                .map((m) => (
                  <option key={m.employeeId} value={m.employeeId}>
                    {m.displayName} · {m.designation}
                  </option>
                ))}
            </Select>
          </Field>
          <Field
            label="Manages departments"
            hint="Department heads see all performance reviews in their department(s)."
            className="sm:col-span-2"
          >
            <div className="grid grid-cols-1 gap-2 rounded-md border border-default bg-card p-3 sm:grid-cols-2">
              {DEPARTMENTS.map((d) => {
                const checked = form.managedDepartments.includes(d);
                return (
                  <label key={d} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.managedDepartments, d]
                          : form.managedDepartments.filter((x) => x !== d);
                        set('managedDepartments', next);
                      }}
                      className="h-4 w-4 rounded border-default text-[#0C447C]-600 focus:ring-[#0C447C]-500"
                    />
                    <span>{d}</span>
                  </label>
                );
              })}
            </div>
          </Field>
        </CardBody>
      </Card>

      {canEditSensitive ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compensation</CardTitle>
                <Badge variant="warning">Encrypted</Badge>
              </div>
              <CardDescription>
                Stored encrypted. Visible only to founders / HR with `view_compensation`.
              </CardDescription>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <Field label="CTC">
                <Input
                  value={form.compensation.ctc ?? ''}
                  onChange={(e) => setNested('compensation', 'ctc', e.target.value)}
                />
              </Field>
              <Field label="Salary">
                <Input
                  value={form.compensation.salary ?? ''}
                  onChange={(e) => setNested('compensation', 'salary', e.target.value)}
                />
              </Field>
              <Field label="Bonus">
                <Input
                  value={form.compensation.bonus ?? ''}
                  onChange={(e) => setNested('compensation', 'bonus', e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bank details</CardTitle>
                <Badge variant="warning">Encrypted</Badge>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <Field label="Account number">
                <Input
                  value={form.bank.accountNumber ?? ''}
                  onChange={(e) => setNested('bank', 'accountNumber', e.target.value)}
                />
              </Field>
              <Field label="IFSC">
                <Input
                  value={form.bank.ifsc ?? ''}
                  onChange={(e) => setNested('bank', 'ifsc', e.target.value)}
                />
              </Field>
              <Field label="Beneficiary name">
                <Input
                  value={form.bank.beneficiaryName ?? ''}
                  onChange={(e) => setNested('bank', 'beneficiaryName', e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Identity & personal</CardTitle>
                <Badge variant="warning">Encrypted</Badge>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="PAN">
                <Input
                  value={form.identity.pan ?? ''}
                  onChange={(e) => setNested('identity', 'pan', e.target.value)}
                />
              </Field>
              <Field label="Aadhaar">
                <Input
                  value={form.identity.aadhaar ?? ''}
                  onChange={(e) => setNested('identity', 'aadhaar', e.target.value)}
                />
              </Field>
              <Field label="Date of birth">
                <Input
                  type="date"
                  value={form.dob ?? ''}
                  onChange={(e) => set('dob', e.target.value || null)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Address</CardTitle>
                <Badge variant="warning">Encrypted</Badge>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Line 1" className="sm:col-span-2">
                <Input
                  value={form.address.line1 ?? ''}
                  onChange={(e) => setNested('address', 'line1', e.target.value)}
                />
              </Field>
              <Field label="Line 2" className="sm:col-span-2">
                <Input
                  value={form.address.line2 ?? ''}
                  onChange={(e) => setNested('address', 'line2', e.target.value)}
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.address.city ?? ''}
                  onChange={(e) => setNested('address', 'city', e.target.value)}
                />
              </Field>
              <Field label="State">
                <Input
                  value={form.address.state ?? ''}
                  onChange={(e) => setNested('address', 'state', e.target.value)}
                />
              </Field>
              <Field label="Pincode">
                <Input
                  value={form.address.pincode ?? ''}
                  onChange={(e) => setNested('address', 'pincode', e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Emergency contact</CardTitle>
                <Badge variant="warning">Encrypted</Badge>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact name">
                <Input
                  value={form.emergencyContact.name ?? ''}
                  onChange={(e) => setNested('emergencyContact', 'name', e.target.value)}
                />
              </Field>
              <Field label="Contact phone">
                <Input
                  value={form.emergencyContact.phone ?? ''}
                  onChange={(e) => setNested('emergencyContact', 'phone', e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="text-sm text-muted">
            Sensitive fields (compensation, bank, identity, address, emergency contact) are hidden —
            you don&apos;t have permission to edit them.
          </CardBody>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-default bg-card px-6 py-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Create employee' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

export type ManagerOption = Pick<EmployeePublic, 'employeeId' | 'displayName' | 'designation'>;
