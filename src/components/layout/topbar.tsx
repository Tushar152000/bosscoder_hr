'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { initials } from '@/lib/utils';
import type { Role } from '@/lib/auth/roles';

export function Topbar({
  user,
}: {
  user: {
    email: string;
    displayName: string | null;
    photoURL: string | null;
    roles: Role[];
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await Promise.allSettled([signOut(auth), fetch('/api/auth/logout', { method: 'POST' })]);
      router.replace('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-default bg-card px-6">
      <div className="text-sm text-muted">
        Signed in as <span className="font-medium text-gray-900">{user.email}</span>
        {user.roles.length > 0 && (
          <>
            {' '}
            ·{' '}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {user.roles.join(' + ')}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0C447C]-100 text-xs font-semibold text-[#0C447C]-700">
            {initials(user.displayName, user.email)}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} disabled={busy}>
          <LogOut className="h-4 w-4" />
          {busy ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </header>
  );
}
