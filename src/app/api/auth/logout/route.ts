import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST() {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;

  if (cookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(cookie);
      await adminAuth.revokeRefreshTokens(decoded.uid);
      await writeAuditLog({
        actorUid: decoded.uid,
        actorEmail: decoded.email ?? '',
        action: 'auth.logout',
        resource: { type: 'session', id: decoded.uid },
      });
    } catch {
      // expired/invalid — clear cookie below regardless
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
