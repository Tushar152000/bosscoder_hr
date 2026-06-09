import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type BadgeTone = 'info' | 'warning' | 'success';

const BADGE: Record<BadgeTone, string> = {
  info:    'bg-[#E6F1FB] text-[#0C447C]',
  warning: 'bg-[#FAECE7] text-[#993C1D]',
  success: 'bg-[#E1F5EE] text-[#0F6E56]',
};

interface Props {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeTone?: BadgeTone;
  comingSoon?: boolean;
}

export function QuickCard({
  href,
  title,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
  badgeTone = 'info',
  comingSoon,
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4 w-full overflow-hidden',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:border-slate-300',
        comingSoon && 'pointer-events-none opacity-60'
      )}
    >

      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-2xl"
        style={{ backgroundColor: iconBg }}
      />

      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} color={iconColor} />
        </div>

        {comingSoon ? (
          <span className="text-[9px] font-semibold tracking-[1px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            SOON
          </span>
        ) : (
          <ArrowRight
            size={15}
            className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-200 mt-0.5"
          />
        )}
      </div>

      <div>
        <p className="text-[14px] font-semibold text-slate-900 leading-snug">{title}</p>
        <p className="text-[12px] text-slate-500 leading-relaxed mt-1">{description}</p>
      </div>

      {badge && (
        <span className={cn('self-start text-[10px] font-medium px-2 py-0.5 rounded-full', BADGE[badgeTone])}>
          {badge}
        </span>
      )}
    </Link>
  );
}
