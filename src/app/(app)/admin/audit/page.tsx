import { requirePermission } from '@/lib/auth/guard';
import { readAuditLog } from '@/lib/audit';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Audit Log' };

export default async function AuditLogPage() {
  await requirePermission('view_audit_log');
  const entries = await readAuditLog({ limit: 100 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted">
          Latest 100 events. Every login, sensitive read, and admin change is recorded.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-default bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted">
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
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-default">
                  <td className="px-4 py-3 align-top text-xs text-muted">
                    {e.at?.toDate ? formatDateTime(e.at.toDate()) : '—'}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{e.actorEmail}</div>
                    <div className="text-xs text-muted">{e.actorUid}</div>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 align-top text-xs">
                    <div>{e.resource.type}</div>
                    <div className="text-muted">{e.resource.id}</div>
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
