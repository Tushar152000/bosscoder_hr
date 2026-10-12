import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canViewFeedback } from '@/lib/feedback/access';
import { listFeedback } from '@/lib/firestore/feedback';
import { formatDateTime } from '@/lib/format';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';

export const metadata = { title: 'Feedback inbox' };

/** Private inbox — 404s for everyone except the configured feedback viewers. */
export default async function FeedbackInboxPage() {
  const user = await requireUser();
  if (!canViewFeedback(user)) notFound();

  const entries = await listFeedback();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-6 py-6 md:px-10">
      <Breadcrumbs items={[{ label: 'Feedback inbox' }]} />
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Feedback inbox</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {entries.length} message{entries.length !== 1 ? 's' : ''} from the home-page feedback chat · only you can see this page
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
            <MessageCircle className="h-5 w-5 text-slate-400" />
          </span>
          <p className="text-[13px] text-slate-500">No feedback yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((f) => (
            <li key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                  style={{ backgroundColor: colorForName(f.name) }}
                >
                  {initials(f.name, f.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-[13px] font-semibold text-slate-900">
                      {f.name} <span className="font-normal text-slate-400">· {f.email}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">{f.createdAt ? formatDateTime(f.createdAt) : '—'}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700">{f.message}</p>
                  {f.page && <p className="mt-2 text-[11px] text-slate-400">Sent from {f.page}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
