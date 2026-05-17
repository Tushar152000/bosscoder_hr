import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

export function SectionHeader({ icon: Icon, iconBg, iconColor, title, description }: Props) {
  return (
    <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-200/70 mb-4">
      <div
        className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={15} color={iconColor} />
      </div>
      <div>
        <p className="text-[14px] font-medium text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
    </div>
  );
}
