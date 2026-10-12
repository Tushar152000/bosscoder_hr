'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { writeAuditLog } from '@/lib/audit';
import { setQuickCardOrder } from '@/lib/firestore/hr-settings';

const orderSchema = z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(30);

/** HR/founders set the order of the home Quick access cards for everyone. */
export async function saveQuickCardOrderAction(
  order: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) return { ok: false, error: 'Only HR can change the home layout' };

  const parsed = orderSchema.safeParse(order);
  if (!parsed.success) return { ok: false, error: 'Invalid card order' };

  await setQuickCardOrder(parsed.data, user.email);
  await writeAuditLog({
    actorUid: user.uid,
    actorEmail: user.email,
    action: 'settings.update',
    resource: { type: 'hr_settings', id: 'home' },
    metadata: { quickCardOrder: parsed.data },
  });
  revalidatePath('/');
  return { ok: true };
}
