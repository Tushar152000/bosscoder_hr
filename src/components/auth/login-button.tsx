'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get('next') || '/';

  async function signIn() {
    setError(null);
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        hd: (process.env.NEXT_PUBLIC_AUTH_HD || 'bosscoderacademy.com').trim(),
      });
      const cred = await signInWithPopup(auth, provider);
      // First exchange — server creates/updates the user record and writes custom claims.
      const idToken = await cred.user.getIdToken();
      const res1 = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res1.ok) {
        const j = await res1.json().catch(() => ({}));
        throw new Error(j.error || 'Sign-in rejected');
      }
      // Force a fresh ID token so the latest custom claims (roles/perms) are embedded
      // in the session cookie we mint on the second exchange.
      const refreshed = await cred.user.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: refreshed }),
      });
      router.replace(next);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={signIn} disabled={loading} className="w-full">
        {loading ? 'Signing in…' : 'Continue with Google'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
