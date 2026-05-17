import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginLeftPanel } from '@/components/auth/login-left-panel';
import { LoginRightPanel } from '@/components/auth/login-right-panel';

export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/directory');

  return (
    <div className="min-h-screen w-full grid md:grid-cols-2 bg-white">
      <LoginLeftPanel />
      <LoginRightPanel />
    </div>
  );
}
