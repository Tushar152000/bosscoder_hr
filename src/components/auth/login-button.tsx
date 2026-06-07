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
    <div className="flex flex-col gap-3">
      <button
        onClick={signIn}
        disabled={loading}
        className="relative w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#0C447C] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0a3a6b] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            {/* Google G icon */}
            <svg width="16" height="16" viewBox="0 0 48 48" className="shrink-0">
              <path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z"/>
            </svg>
            Continue with Google
          </>
        )}
      </button>

      {error && (
        <p className="text-[12px] text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
