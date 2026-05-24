import { Gift, Clock, IndianRupee } from 'lucide-react';

const STEPS = [
  {
    icon: Gift,
    iconBg: '#EBF3FE',
    iconColor: '#0C447C',
    title: 'Grant',
    desc: 'Company awards you a number of options at a fixed exercise price.',
  },
  {
    icon: Clock,
    iconBg: '#FEF3E7',
    iconColor: '#854F0B',
    title: 'Vest',
    desc: 'Options unlock gradually over time based on your vesting schedule.',
  },
  {
    icon: IndianRupee,
    iconBg: '#E1F5EE',
    iconColor: '#27500A',
    title: 'Exercise',
    desc: 'Once vested, you can buy shares at the exercise price — your profit is the difference.',
  },
];

const TERMS = [
  { term: 'Options', def: 'Right to buy 1 equity share each at the exercise price.' },
  { term: 'Vesting', def: 'Process by which options become exercisable over time.' },
  { term: 'Cliff', def: 'Minimum period you must work before any options vest.' },
  { term: 'Exercise price', def: 'Fixed price at which you can buy shares (e.g. ₹2).' },
  { term: 'Exercise', def: 'Converting your vested options into actual equity shares.' },
  { term: 'Lapse', def: 'Options that expire unused after the exercise period ends.' },
];

export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* How it works */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-4">
        <p className="text-[13px] font-semibold text-[#0f172a]">How it works</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex-1 flex flex-col items-center text-center gap-2 relative">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: s.iconBg }}
                >
                  <Icon size={18} color={s.iconColor} />
                </div>
                <p className="text-[12px] font-semibold text-[#0f172a]">{s.title}</p>
                <p className="text-[11px] text-[#64748b] leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <span className="hidden sm:block absolute right-[-10px] top-4 text-[#CBD5E1] text-lg select-none">→</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 text-[11px] text-[#64748b] leading-relaxed">
          <span className="font-medium text-[#0f172a]">Remember:</span> Options are not shares yet. You become a shareholder only after exercising your vested options.
        </div>
      </div>

      {/* Key terms */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-4">
        <p className="text-[13px] font-semibold text-[#0f172a]">Key terms</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TERMS.map((t) => (
            <div key={t.term} className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2.5 space-y-0.5">
              <p className="text-[11px] font-semibold text-[#0C447C]">{t.term}</p>
              <p className="text-[11px] text-[#64748b] leading-snug">{t.def}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
