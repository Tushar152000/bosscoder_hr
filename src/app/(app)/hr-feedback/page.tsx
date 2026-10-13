import Link from 'next/link';
import { ArrowRight, Bell, EyeOff, Inbox, MessageSquareText } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { countNewHrFeedback, listMyHrFeedback } from '@/lib/firestore/hr-feedback';
import { canManageHrFeedback } from '@/lib/hr-feedback/access';
import { CATEGORY_COLOR, CATEGORY_LABEL, SENDER_STATUS_LABEL, type HrFeedbackStatus } from '@/lib/hr-feedback/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { HrFeedbackSendForm } from '@/components/hr-feedback/send-form';

export const metadata = { title: 'Feedback to HR' };

const STATUS_STYLE: Record<HrFeedbackStatus, string> = {
  new: 'bg-slate-100 text-slate-600',
  'in-review': 'bg-[#FAEEDA] text-[#854F0B]',
  resolved: 'bg-[#E1F5EE] text-[#0F6E56]',
};

export default async function HrFeedbackPage() {
  const user = await requireUser();
  const isHr = canManageHrFeedback(user);
  const [mine, newCount] = await Promise.all([
    listMyHrFeedback(user.uid),
    isHr ? countNewHrFeedback() : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-10">
      <div className="space-y-1.5">
        <Breadcrumbs items={[{ label: 'Feedback to HR' }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900">Feedback to HR</h1>
            <p className="mt-1 max-w-xl text-[13px] text-slate-500">
              Share a concern, an idea or a question with the HR team. You can send it with your name or
              anonymously.
            </p>
          </div>
          {isHr && (
            <Link
              href="/hr-feedback/inbox"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <Inbox className="h-4 w-4" />
              HR inbox
              {newCount > 0 && (
                <span className="rounded-full bg-[#0C447C] px-1.5 text-[11px] font-semibold tabular-nums text-white">
                  {newCount} new
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <HrFeedbackSendForm />

          <section aria-labelledby="your-messages" className="space-y-3">
            <h2 id="your-messages" className="text-[15px] font-semibold text-slate-900">
              Your messages
              <span className="ml-1.5 font-normal tabular-nums text-slate-400">{mine.length}</span>
            </h2>
            {mine.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[13px] text-slate-500">
                Messages you send with your name show up here, along with HR’s replies.
              </p>
            ) : (
              <ul className="space-y-3">
                {mine.map((f) => (
                  <li key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-700">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[f.category] }} />
                        {CATEGORY_LABEL[f.category]}
                      </span>
                      <span className="text-[12px] text-slate-400">
                        {f.createdAt ? formatDate(new Date(f.createdAt)) : ''}
                      </span>
                      <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[11.5px] font-semibold', STATUS_STYLE[f.status])}>
                        {SENDER_STATUS_LABEL[f.status]}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{f.message}</p>
                    {f.response && (
                      <div className="mt-3 rounded-lg border border-[#B5D4F4] bg-[#EBF3FE] px-3.5 py-3">
                        <p className="text-[12px] font-semibold text-[#0C447C]">
                          Reply from {f.handledByName ?? 'HR'}
                          {f.respondedAt && (
                            <span className="font-normal text-[#0C447C]/70"> · {formatDate(new Date(f.respondedAt))}</span>
                          )}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-800">{f.response}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[13px] font-semibold text-slate-900">What happens next</p>
            <ul className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-slate-600">
              <li className="flex gap-2.5">
                <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-[#0C447C]" />
                Only HR and the founders can read what you send. It isn’t shared with your manager.
              </li>
              <li className="flex gap-2.5">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#0C447C]" />
                When HR replies or resolves it, you get a notification and the reply appears here.
              </li>
              <li className="flex gap-2.5">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#0C447C]" />
                Anonymous messages are saved without your name, email or department.
              </li>
            </ul>
          </div>
          <p className="px-1 text-[12px] leading-relaxed text-slate-400">
            Found a bug in the HR portal itself? Use the Feedback button on the home page instead.
          </p>
        </aside>
      </div>
    </div>
  );
}
