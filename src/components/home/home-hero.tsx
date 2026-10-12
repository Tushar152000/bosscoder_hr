import { CalendarDays, Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeHeroProps {
  firstName: string;
  /** "morning" | "afternoon" | "evening" — drives the colour scheme and icon. */
  timeOfDay: string;
  dateLabel: string;
}

const THEMES: Record<string, { bg: string; glow: string; orb: string; icon: LucideIcon; iconColor: string }> = {
  morning: {
    bg: 'from-[#FFF4E2] via-[#FFF9F1] to-[#EAF3FF]',
    glow: 'bg-[#FDBA74]/30',
    orb: 'from-[#FDBA74] to-[#F97316]',
    icon: Sun,
    iconColor: 'text-white',
  },
  afternoon: {
    bg: 'from-[#E3EEFF] via-[#F2F7FF] to-[#FFF3DF]',
    glow: 'bg-[#FCD34D]/30',
    orb: 'from-[#FCD34D] to-[#F59E0B]',
    icon: Sun,
    iconColor: 'text-white',
  },
  evening: {
    bg: 'from-[#E9E7FF] via-[#F3F1FF] to-[#E3EEFF]',
    glow: 'bg-[#A5B4FC]/35',
    orb: 'from-[#818CF8] to-[#4338CA]',
    icon: Moon,
    iconColor: 'text-white',
  },
};

export function HomeHero({ firstName, timeOfDay, dateLabel }: HomeHeroProps) {
  const t = THEMES[timeOfDay] ?? THEMES.afternoon;
  const Icon = t.icon;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white bg-gradient-to-br px-6 py-6 shadow-[0_8px_30px_-12px_rgba(12,68,124,0.25)] ring-1 ring-[#0C447C]/[0.06] md:px-8 md:py-7',
        t.bg,
      )}
    >
      {/* Soft glow behind the orb */}
      <div className={cn('pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full blur-3xl', t.glow)} />

      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-[#0C447C] shadow-sm ring-1 ring-[#0C447C]/10 backdrop-blur">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}
          </span>
          <h1 className="mt-3 text-[22px] font-bold leading-tight tracking-tight text-[#202658] md:text-[32px]">
            Good {timeOfDay}, <span className="whitespace-nowrap">{firstName} 👋</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-slate-600 md:text-[14px]">
            Here&apos;s an overview of your workspace today.
          </p>
        </div>

        {/* Time-of-day orb inside concentric rings */}
        <div className="relative hidden h-28 w-28 shrink-0 items-center justify-center sm:flex md:h-32 md:w-32">
          <span className="absolute inset-0 rounded-full border border-white/70" />
          <span className="absolute inset-3 rounded-full border border-white/80 bg-white/30" />
          <span
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br shadow-lg md:h-16 md:w-16',
              t.orb,
            )}
          >
            {/* Filled glyph — the thin outline sun read like a gear at this size. */}
            <Icon className={cn('h-7 w-7 md:h-8 md:w-8', t.iconColor)} fill="currentColor" strokeWidth={2.25} />
          </span>
        </div>
      </div>
    </div>
  );
}
