import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { listHrUsers } from '@/lib/firestore/users';
import { getAllDocuments } from '@/lib/firestore/documents';
import { getAllEmployeesForTree } from '@/lib/firestore/employees';
import { DOCUMENT_TYPES } from '@/lib/documents-config';
import { DocumentsFilter } from '@/components/settings/documents-filter';
import { RemindButton } from '@/components/settings/remind-button';
import { Check, ExternalLink } from 'lucide-react';
import type { DocumentType, HrDocument } from '@/lib/firestore/documents';

export const metadata = { title: 'Employee Documents · Settings' };

const ROLE_LABEL: Record<string, string> = {
  founder: 'Founder',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
};

const ROLE_COLOR: Record<string, string> = {
  founder: 'bg-purple-50 text-purple-700 border-purple-200',
  hr: 'bg-[#E6F1FB] text-[#0C447C] border-[#C3D9EF]',
  manager: 'bg-sky-50 text-sky-700 border-sky-200',
  employee: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface PageProps {
  searchParams: Promise<{ q?: string; dept?: string }>;
}

export default async function EmployeeDocumentsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) redirect('/?error=forbidden');

  const { q = '', dept = '' } = await searchParams;

  const [users, allDocs, allEmployees] = await Promise.all([
    listHrUsers(),
    getAllDocuments(),
    getAllEmployeesForTree(),
  ]);

  const deptByUid = new Map<string, string>();
  for (const emp of allEmployees) {
    if (emp.userUid) deptByUid.set(emp.userUid, emp.department);
  }

  const departments = [
    ...new Set(allEmployees.map((e) => e.department).filter(Boolean)),
  ].sort();

  const docsByUid = new Map<string, Map<DocumentType, HrDocument>>();
  for (const doc of allDocs) {
    if (!docsByUid.has(doc.uid)) docsByUid.set(doc.uid, new Map());
    docsByUid.get(doc.uid)!.set(doc.docType, doc);
  }

  let activeUsers = users.filter((u) => u.active);

  if (q.trim()) {
    const ql = q.trim().toLowerCase();
    activeUsers = activeUsers.filter(
      (u) =>
        (u.displayName ?? '').toLowerCase().includes(ql) ||
        u.email.toLowerCase().includes(ql),
    );
  }

  if (dept) {
    activeUsers = activeUsers.filter((u) => deptByUid.get(u.uid) === dept);
  }

  const REQUIRED_TYPES = DOCUMENT_TYPES.filter((d) => !d.optional);

  const totalActive = users.filter((u) => u.active).length;
  const uploadedCount = allDocs.filter((d) =>
    REQUIRED_TYPES.some((t) => t.key === d.docType),
  ).length;
  const totalPossible = totalActive * REQUIRED_TYPES.length;
  const coveragePct =
    totalPossible > 0 ? Math.round((uploadedCount / totalPossible) * 100) : 0;

  return (
    <div className="max-w-full space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[18px] font-semibold text-slate-900">Employee Documents</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Track document submissions across the team. Send targeted reminders for missing files.
        </p>
      </div>

      {/* Summary cards — required docs only */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {REQUIRED_TYPES.map(({ key, label }) => {
          const count = allDocs.filter((d) => d.docType === key).length;
          const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
          return (
            <div
              key={key}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2"
            >
              <p className="text-[11px] text-slate-500 font-medium">{label}</p>
              <div className="flex items-end justify-between">
                <p className="text-[24px] font-bold text-slate-900 leading-none">{count}</p>
                <p className="text-[11px] text-slate-400 pb-0.5">of {totalActive}</p>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0C447C] rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">{pct}% uploaded</p>
            </div>
          );
        })}
      </div>

      {/* Overall coverage */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 md:px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-slate-700">Overall coverage</p>
          <span
            className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
              coveragePct === 100
                ? 'bg-emerald-50 text-emerald-700'
                : coveragePct >= 50
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {coveragePct}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              coveragePct === 100
                ? 'bg-emerald-500'
                : coveragePct >= 50
                ? 'bg-amber-400'
                : 'bg-[#0C447C]'
            }`}
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          {uploadedCount} of {totalPossible} required documents uploaded across {totalActive} members
        </p>
      </div>

      {/* Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Table header + filters */}
        <div className="px-4 md:px-5 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-700">All members</p>
            <p className="text-[12px] text-slate-500">
              {activeUsers.length}{' '}
              {activeUsers.length !== 1 ? 'results' : 'result'}
              {(q || dept) && <span className="text-slate-400"> · filtered</span>}
            </p>
          </div>
          <DocumentsFilter departments={departments} />
        </div>

        {activeUsers.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-center">
            <p className="text-[13px] font-medium text-slate-600">No members found</p>
            <p className="text-[12px] text-slate-400">Try adjusting your search or department filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 md:px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Member
                  </th>
                  {DOCUMENT_TYPES.map(({ label, optional }) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center min-w-[110px]"
                    >
                      {label}
                      {optional && (
                        <span className="ml-1 normal-case text-[9px] font-medium text-slate-400 border border-slate-200 rounded px-1 py-0.5">
                          opt
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeUsers.map((u) => {
                  const userDocs = docsByUid.get(u.uid);
                  const primaryRole = u.roles[0];
                  const displayName = u.displayName ?? u.email;
                  const department = deptByUid.get(u.uid);
                  const uploadedForUser = REQUIRED_TYPES.filter((d) =>
                    userDocs?.has(d.key),
                  ).length;
                  const allComplete = uploadedForUser === REQUIRED_TYPES.length;

                  return (
                    <tr
                      key={u.uid}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Member column */}
                      <td className="px-4 md:px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Avatar initials */}
                          <div className="w-8 h-8 rounded-full bg-[#0C447C] flex items-center justify-center text-white text-[11px] font-semibold shrink-0 select-none">
                            {(displayName[0] ?? '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 truncate max-w-[150px]">
                              {displayName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                {u.email}
                              </p>
                              {primaryRole && (
                                <span
                                  className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                                    ROLE_COLOR[primaryRole] ?? ROLE_COLOR.employee
                                  }`}
                                >
                                  {ROLE_LABEL[primaryRole] ?? primaryRole}
                                </span>
                              )}
                            </div>
                            {department && (
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                                {department}
                              </p>
                            )}
                            {/* Segmented completion bar */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="flex gap-0.5">
                                {REQUIRED_TYPES.map((d) => (
                                  <div
                                    key={d.key}
                                    title={d.label}
                                    className={`w-4 h-1 rounded-full transition-colors ${
                                      userDocs?.has(d.key)
                                        ? 'bg-emerald-400'
                                        : 'bg-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span
                                className={`text-[10px] font-semibold ${
                                  allComplete ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              >
                                {uploadedForUser}/{REQUIRED_TYPES.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Doc columns */}
                      {DOCUMENT_TYPES.map(({ key }) => {
                        const doc = userDocs?.get(key);
                        return (
                          <td
                            key={key}
                            className="px-4 py-4 text-center whitespace-nowrap align-middle"
                          >
                            {doc ? (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex flex-col items-center gap-1 group/cell"
                                title={doc.fileName}
                              >
                                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover/cell:bg-emerald-100 transition-colors">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <span className="text-[10px] font-medium text-[#0C447C] group-hover/cell:underline flex items-center gap-0.5">
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </a>
                            ) : (
                              <div className="inline-flex flex-col items-center gap-1.5">
                                <div className="w-7 h-7 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                </div>
                                <RemindButton uid={u.uid} docType={key} />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
