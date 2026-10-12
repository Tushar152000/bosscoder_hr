'use client';

import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

/** OAuth Web client ID of the Firebase project — enables Google's in-page One Tap picker. */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
const HOSTED_DOMAIN = (process.env.NEXT_PUBLIC_AUTH_HD || 'bosscoderacademy.com').trim();

/** Minimal typing for Google Identity Services (loaded from accounts.google.com/gsi/client). */
interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (res: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
    hd?: string;
  }): void;
  prompt(): void;
  cancel(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

export function LoginButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);

  const next = searchParams.get('next') || '/';

  /** Exchange the signed-in Firebase user for our session cookie, then go in. */
  const completeSignIn = useCallback(
    async (firebaseUser: User) => {
      const idToken = await firebaseUser.getIdToken();
      const res1 = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const j1 = await res1.json().catch(() => ({}));
      if (!res1.ok) throw new Error(j1.error || 'Sign-in rejected');

      // Only when the server had to update this user's roles: refresh the token so
      // the new claims are embedded, and swap in a cookie minted from it.
      if (j1.needsRefresh) {
        const refreshed = await firebaseUser.getIdToken(true);
        const res2 = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: refreshed, phase: 'finalize' }),
        });
        if (!res2.ok) {
          const j2 = await res2.json().catch(() => ({}));
          throw new Error(j2.error || 'Sign-in rejected');
        }
      }
      router.replace(next);
      router.refresh();
    },
    [next, router],
  );

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : 'Sign-in failed');
    setLoading(false);
  }, []);

  // In-page Google account picker (One Tap / FedCM). Falls back to the button
  // when no client ID is configured or the user dismisses it.
  useEffect(() => {
    if (!gsiReady || !GOOGLE_CLIENT_ID || !window.google) return;
    const gsi = window.google.accounts.id;
    gsi.initialize({
      client_id: GOOGLE_CLIENT_ID,
      hd: HOSTED_DOMAIN,
      context: 'signin',
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
      callback: async ({ credential }) => {
        setError(null);
        setLoading(true);
        try {
          await setPersistence(auth, browserLocalPersistence);
          const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(credential));
          await completeSignIn(cred.user);
        } catch (e) {
          fail(e);
        }
      },
    });
    gsi.prompt();
    return () => gsi.cancel();
  }, [gsiReady, completeSignIn, fail]);

  async function signIn() {
    setError(null);
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account', hd: HOSTED_DOMAIN });
      const cred = await signInWithPopup(auth, provider);
      await completeSignIn(cred.user);
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {GOOGLE_CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setGsiReady(true)}
        />
      )}
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
