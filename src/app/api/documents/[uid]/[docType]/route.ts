import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isPrivileged } from '@/lib/auth/roles';
import { adminStorage } from '@/lib/firebase/admin';
import { getDocument } from '@/lib/firestore/documents';
import { storagePathOf } from '@/lib/documents/files';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streams one personal document. The objects in storage are private; this is
 * the only way to open them. Allowed: the document's owner, and HR / founders.
 * Opening someone else's document is written to the audit log.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ uid: string; docType: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { uid, docType } = await params;
  const own = user.uid === uid;
  if (!own && !isPrivileged(user.roles)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const doc = await getDocument(uid, docType);
  const path = doc ? storagePathOf(doc.raw) : null;
  if (!doc || !path) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  let body: Buffer;
  try {
    [body] = await adminStorage.bucket().file(path).download();
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (!own) {
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'employee.read_sensitive',
      resource: { type: 'document', id: `${uid}_${docType}` },
      metadata: { docType },
    }).catch(() => {});
  }

  const name = (doc.fileName || `${docType}`).replace(/["\\\r\n]/g, '');
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': doc.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${name}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
