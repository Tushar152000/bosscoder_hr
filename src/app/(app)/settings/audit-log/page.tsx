import { requirePermission } from '@/lib/auth/guard';
import { readAuditLog } from '@/lib/audit';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Audit log · Settings' };

export default async function AuditLogSettingsPage() {
  await requirePermission('view_audit_log');
  const entries = await readAuditLog({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-900">Audit log</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Latest 100 events. Every login, sensitive read, and admin change is recorded.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {e.at?.toDate ? formatDateTime(e.at.toDate()) : '—'}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-900">{e.actorEmail}</div>
                    <div className="text-xs text-slate-500">{e.actorUid}</div>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 align-top text-xs">
                    <div>{e.resource.type}</div>
                    <div className="text-slate-500">{e.resource.id}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
