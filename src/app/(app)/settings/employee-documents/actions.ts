'use server';

import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { writeNotificationsForReviewers } from '@/lib/firestore/notifications';
import { DOCUMENT_TYPES } from '@/lib/documents-config';
import { redirect } from 'next/navigation';

export async function sendDocumentReminderAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  if (!isPrivileged(actor.roles)) redirect('/?error=forbidden');

  const uid = formData.get('uid') as string | null;
  const docType = formData.get('docType') as string | null;
  if (!uid) throw new Error('Missing uid');

  const docConfig = DOCUMENT_TYPES.find((d) => d.key === docType);
  const title = docConfig
    ? `Action required: Please upload your ${docConfig.label} in the HR portal.`
    : 'Action required: Please complete your document uploads in the HR portal.';

  await writeNotificationsForReviewers([{ uid, title, href: '/settings/account', tone: 'warning' }]);
}
