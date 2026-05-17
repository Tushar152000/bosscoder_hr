import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import { LoginButton } from '@/components/auth/login-button';
import { BosscoderLogo } from '@/assets/images/BosscoderLogo';

export function LoginRightPanel() {
  return (
    <div className="bg-white flex flex-col items-center justify-center p-8 md:p-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <BosscoderLogo width={140} height={29} />
        </div>

        <h1 className="text-[24px] font-semibold text-dark-blue">Welcome back</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-7 mt-2">
          Sign in with your{' '}
          <code className="font-mono text-xs bg-slate-100 text-dark px-1.5 py-0.5 rounded">
            @bosscoderacademy.com
          </code>{' '}
          Google account. Access is restricted to authorized employees only.
        </p>

        <Suspense>
          <LoginButton />
        </Suspense>

        {/* SSO trust line */}
        <div className="mt-5 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <span className="text-xs text-slate-600">
            Single sign-on protected · authorized employees only
          </span>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-slate-400 leading-relaxed">
          Trouble signing in? Reach out to{' '}
          <span className="text-bosscoder-blue">it-support@bosscoderacademy.com</span>
        </p>
      </div>
    </div>
  );
}
