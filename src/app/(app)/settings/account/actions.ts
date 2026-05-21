'use server';

import { requireUser } from '@/lib/auth/guard';
import { adminDb, adminStorage, adminAuth, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { revalidatePath } from 'next/cache';

export async function uploadAvatarAction(formData: FormData): Promise<{ url: string }> {
  const user = await requireUser();

  const file = formData.get('avatar') as File | null;
  if (!file || file.size === 0) throw new Error('No file provided');
  if (file.size > 5 * 1024 * 1024) throw new Error('File too large — max 5 MB');
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `hr/avatars/${user.uid}/profile.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(path);

  await fileRef.save(buffer, { metadata: { contentType: file.type } });
  await fileRef.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${path}`;

  await Promise.all([
    adminDb.collection(HR.users).doc(user.uid).update({
      photoURL: url,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    adminAuth.updateUser(user.uid, { photoURL: url }),
  ]);

  revalidatePath('/', 'layout');
  return { url };
}
