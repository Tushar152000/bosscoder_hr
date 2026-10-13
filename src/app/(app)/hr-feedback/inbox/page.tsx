import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { listHrFeedback } from '@/lib/firestore/hr-feedback';
import { canManageHrFeedback } from '@/lib/hr-feedback/access';
import { HrFeedbackInbox } from '@/components/hr-feedback/inbox';

export const metadata = { title: 'HR inbox' };

/** HR and founders only; everyone else gets a 404. */
export default async function HrFeedbackInboxPage() {
  const user = await requireUser();
  if (!canManageHrFeedback(user)) notFound();
  const items = await listHrFeedback();
  return <HrFeedbackInbox items={items} />;
}
