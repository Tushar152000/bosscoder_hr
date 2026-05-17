import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
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
        'bg-white border border-slate-200/70 rounded-[16px] p-[18px] flex flex-col gap-3.5 w-full',
        'hover:border-slate-300 hover:shadow-sm transition-all duration-150',
        comingSoon && 'opacity-90 pointer-events-none'
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} color={iconColor} />
        </div>
        {comingSoon ? (
          <span className="text-[9px] font-medium tracking-[0.8px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            SOON
          </span>
        ) : (
          <ChevronRight size={16} className="text-slate-300 mt-0.5" />
        )}
      </div>

      <div>
        <p className="text-[14px] font-medium text-slate-900">{title}</p>
        <p className="text-[12px] text-slate-600 leading-snug mt-0.5">{description}</p>
      </div>

      {badge && (
        <span
          className={cn(
            'self-start inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
            BADGE[badgeTone]
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
