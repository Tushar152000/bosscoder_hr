import { requireUser } from '@/lib/auth/guard';
import { Bell } from 'lucide-react';

export const metadata = { title: 'Notifications · Settings' };

export default async function NotificationsSettingsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-900">Notifications</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Choose when and how you get notified.
        </p>
      </div>
      <Placeholder icon={Bell} label="Notification preferences" />
    </div>
  );
}

function Placeholder({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl w-full px-5 py-10 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-[13px] font-medium text-slate-600">{label}</p>
      <p className="text-[12px] text-slate-400 max-w-xs">This section is coming soon.</p>
    </div>
  );
}
