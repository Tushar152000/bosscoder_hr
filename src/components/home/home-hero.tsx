interface HomeHeroProps {
  firstName: string;
  timeOfDay: string;
  dateLabel: string;
  photoURL?: string | null;
  userInitials: string;
  avatarBg: string;
}

export function HomeHero({ firstName, timeOfDay, dateLabel, photoURL, userInitials, avatarBg }: HomeHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EBF3FE] via-[#F5F8FF] to-[#F0FDF8] border border-slate-200/60 px-6 py-5">
      <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[#0C447C]/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[#0F6E56]/10 blur-2xl" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-[#0C447C]/70 mb-1">
            {dateLabel}
          </p>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight leading-tight">
            Good {timeOfDay}, {firstName} 👋
          </h1>
          <p className="text-[13px] text-slate-500 mt-1.5">
            Here&apos;s an overview of your workspace today.
          </p>
        </div>
      </div>
    </div>
  );
}
