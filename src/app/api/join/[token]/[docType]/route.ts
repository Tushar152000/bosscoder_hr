import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase/admin';
import { getEmployeeById } from '@/lib/firestore/employees';
import { getDocument } from '@/lib/firestore/documents';
import { findByToken } from '@/lib/firestore/onboarding';
import { storagePathOf } from '@/lib/documents/files';
import { documentOwnerKey } from '@/lib/documents-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lets a joiner preview the Aadhaar / PAN photo they uploaded on their
 * onboarding link (they aren't signed in, so /api/documents won't serve them).
 * Only while the form is still open to them.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; docType: string }> }) {
  const { token, docType } = await params;
  if (docType !== 'aadhaar' && docType !== 'pan') return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const found = await findByToken(token);
  if (!found.ok || found.record.status === 'submitted' || found.record.status === 'verified') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const employee = await getEmployeeById(found.record.employeeId);
  if (!employee) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const doc = await getDocument(documentOwnerKey(employee), docType);
  const path = doc ? storagePathOf(doc.raw) : null;
  if (!doc || !path) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  let body: Buffer;
  try {
    [body] = await adminStorage.bucket().file(path).download();
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  const name = (doc.fileName || docType).replace(/["\\\r\n]/g, '');
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': doc.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${name}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
