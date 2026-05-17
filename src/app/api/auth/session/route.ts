import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { ensureUserAndSyncClaims } from '@/lib/auth/claims';
import { isEmailAllowed } from '@/lib/auth/roles';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth/cookie';
import { createSessionCookie } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const idToken = body.idToken;
  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!decoded.email || !decoded.email_verified) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 });
  }
  if (!isEmailAllowed(decoded.email)) {
    return NextResponse.json(
      { error: 'Email domain not permitted for this portal' },
      { status: 403 }
    );
  }

  await ensureUserAndSyncClaims({
    uid: decoded.uid,
    email: decoded.email,
    displayName: (decoded.name as string | null) ?? null,
    photoURL: (decoded.picture as string | null) ?? null,
  });

  // Re-mint the session cookie *after* claims are written so they're embedded.
  // The client needs to refresh its ID token before posting again — handled in client login flow.
  const sessionCookie = await createSessionCookie(idToken);

  await writeAuditLog({
    actorUid: decoded.uid,
    actorEmail: decoded.email,
    action: 'auth.login',
    resource: { type: 'session', id: decoded.uid },
    metadata: { provider: decoded.firebase?.sign_in_provider ?? 'google.com' },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return res;
}
