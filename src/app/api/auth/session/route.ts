import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { claimsMatch, ensureUserAndSyncClaims } from '@/lib/auth/claims';
import { isEmailAllowed } from '@/lib/auth/roles';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth/cookie';
import { createSessionCookie } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * Exchanges a Firebase ID token for a session cookie.
 *
 * Normal call: provisions/links the user, syncs custom claims, sets the cookie and
 * returns `needsRefresh` — true only when the claims had to change, in which case the
 * client refreshes its ID token and calls again with `phase: 'finalize'` so the cookie
 * carries the new claims. Returning users with unchanged claims finish in one call.
 */
export async function POST(req: NextRequest) {
  let body: { idToken?: string; phase?: 'finalize' };
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

  // Finalize: the refreshed token already carries the claims written by the first
  // call — just mint the cookie. Anything else goes through the full login path.
  const isFinalize =
    body.phase === 'finalize' &&
    decoded.hr === true &&
    claimsMatch(decoded, (decoded.roles as string[]) ?? [], (decoded.perms as string[]) ?? []);

  let needsRefresh = false;
  let sessionCookie: string;
  if (isFinalize) {
    sessionCookie = await createSessionCookie(idToken);
  } else {
    const { claimsChanged } = await ensureUserAndSyncClaims({
      uid: decoded.uid,
      email: decoded.email,
      displayName: (decoded.name as string | null) ?? null,
      photoURL: (decoded.picture as string | null) ?? null,
      tokenClaims: decoded,
    });
    needsRefresh = claimsChanged;

    // If claims changed, this cookie is replaced by the finalize call.
    [sessionCookie] = await Promise.all([
      createSessionCookie(idToken),
      writeAuditLog({
        actorUid: decoded.uid,
        actorEmail: decoded.email,
        action: 'auth.login',
        resource: { type: 'session', id: decoded.uid },
        metadata: { provider: decoded.firebase?.sign_in_provider ?? 'google.com' },
      }),
    ]);
  }

  const res = NextResponse.json({ ok: true, needsRefresh });
  res.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return res;
}
