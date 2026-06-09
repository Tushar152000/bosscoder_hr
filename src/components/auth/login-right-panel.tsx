import { Suspense } from 'react';
import { ShieldCheck, Users, TrendingUp, PieChart } from 'lucide-react';
import { LoginButton } from '@/components/auth/login-button';
import { BosscoderLogo } from '@/assets/images/BosscoderLogo';

const FEATURES = [
  { icon: Users,       label: 'Employee directory',     desc: 'Browse teams and org chart' },
  { icon: TrendingUp,  label: 'Performance evaluation', desc: 'Ratings, goals & review cycles' },
  { icon: PieChart,    label: 'ESOP portal',            desc: 'Vested grants and statements' },
];

export function LoginRightPanel() {
  return (
    <div className="relative bg-white flex flex-col items-center justify-center p-8 md:p-14 overflow-hidden min-w-[40%]">

      {/* subtle background circles */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#EBF3FE] opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#E1F5EE] opacity-50 blur-3xl" />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="mb-10">
          <BosscoderLogo width={136} height={28} />
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
            Welcome back
          </h1>
          <p className="text-[14px] text-slate-500 mt-2 leading-relaxed">
            Sign in with your{' '}
            <span className="font-mono text-[12px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
              @bosscoderacademy.com
            </span>{' '}
            account to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-[#FAFAFA] p-5 mb-6 shadow-sm">
          <Suspense>
            <LoginButton />
          </Suspense>

          <div className="mt-4 flex items-center gap-2">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            <span className="text-[12px] text-slate-500">
              Single sign-on · authorized employees only
            </span>
          </div>
        </div>

      

        <div className="text-[14px] text-slate-400 leading-[120%] space-y-0.5">
          <p className='text-[12px]'>Trouble signing in? Reach out to us:</p>
          <p>
            <span className="text-dark-blue font-semibold">website.tech@bosscoderacademy.com</span>
          </p>
          <p>
            <span className="text-slate-500 font-medium">+91 83769 51077</span>
          </p>
        </div>
      </div>
    </div>
  );
}
