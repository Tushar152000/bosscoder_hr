import { redirect } from 'next/navigation';

/** The audit log now lives under Settings; keep old links working. */
export default function AuditLogRedirect() {
  redirect('/settings/audit-log');
}
