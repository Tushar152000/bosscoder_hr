import { Moon, Sun } from 'lucide-react';

interface HomeHeroProps {
  firstName: string;
  /** "morning" | "afternoon" | "evening" (India time). */
  timeOfDay: string;
  dateLabel: string;
}

export function HomeHero({ firstName, timeOfDay, dateLabel }: HomeHeroProps) {
  const isEvening = timeOfDay === 'evening';
  const Icon = isEvening ? Moon : Sun;

  return (
    <div className="rounded-2xl border border-[#DCE7F7] bg-gradient-to-r from-[#EEF5FF] to-white px-6 py-5 md:px-8 md:py-6">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 md:text-[13px]">
        <Icon
          className={isEvening ? 'h-4 w-4 text-indigo-500' : 'h-4 w-4 text-amber-500'}
          fill="currentColor"
        />
        {dateLabel}
      </p>
      <h1 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-[#202658] md:text-[28px]">
        Good {timeOfDay}, <span className="whitespace-nowrap">{firstName} 👋</span>
      </h1>
      <p className="mt-1 text-[13px] text-slate-600 md:text-[14px]">
        Here&apos;s an overview of your workspace today.
      </p>
    </div>
  );
}
