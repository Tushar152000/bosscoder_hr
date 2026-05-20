import 'server-only';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed'
  | 'employee.create'
  | 'employee.update'
  | 'employee.delete'
  | 'employee.read_sensitive'
  | 'role.update'
  | 'permission.update'
  | 'review_cycle.create'
  | 'review_cycle.close'
  | 'review_cycle.nudge'
  | 'review.submit'
  | 'review.nudge_manager'
  | 'review.read'
  | 'offer.create'
  | 'offer.send'
  | 'offer.update'
  | 'offer.read';

export interface AuditEntry {
  actorUid: string;
  actorEmail: string;
  action: AuditAction;
  resource: { type: string; id: string };
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await adminDb.collection(HR.auditLogs).add({
    ...entry,
    metadata: entry.metadata ?? {},
    at: FieldValue.serverTimestamp(),
  });
}

export interface AuditEntryRead extends AuditEntry {
  id: string;
  at: FirebaseFirestore.Timestamp;
}

export async function readAuditLog(opts: {
  limit?: number;
  actorUid?: string;
  resourceType?: string;
  resourceId?: string;
} = {}): Promise<AuditEntryRead[]> {
  let q: FirebaseFirestore.Query = adminDb.collection(HR.auditLogs);
  if (opts.actorUid) q = q.where('actorUid', '==', opts.actorUid);
  if (opts.resourceType) q = q.where('resource.type', '==', opts.resourceType);
  if (opts.resourceId) q = q.where('resource.id', '==', opts.resourceId);
  q = q.orderBy('at', 'desc').limit(opts.limit ?? 100);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntryRead, 'id'>) }));
}
