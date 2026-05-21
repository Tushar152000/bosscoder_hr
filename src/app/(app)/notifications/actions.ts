'use server';

import { requireUser } from '@/lib/auth/guard';
import { markAllNotificationsRead } from '@/lib/firestore/notifications';

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsRead(user.uid);
}
