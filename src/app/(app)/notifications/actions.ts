'use server';

import { requireUser } from '@/lib/auth/guard';
import { markAllNotificationsRead, clearAllNotifications } from '@/lib/firestore/notifications';

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsRead(user.uid);
}

export async function clearAllNotificationsAction(): Promise<void> {
  const user = await requireUser();
  await clearAllNotifications(user.uid);
}
