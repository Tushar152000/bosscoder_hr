'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { initials } from '@/lib/utils';
import { uploadAvatarAction } from '@/app/(app)/settings/account/actions';

interface Props {
  uid: string;
  photoURL: string | null;
  displayName: string | null;
  email: string;
}

export function AvatarUploader({ photoURL, displayName, email }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentPhoto = preview ?? photoURL;
  const userInitials = initials(displayName, email);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append('avatar', file);

    startTransition(async () => {
      try {
        await uploadAvatarAction(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setPreview(null);
      }
    });

    // reset input so the same file can be re-selected if needed
    e.target.value = '';
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => !isPending && inputRef.current?.click()}
          className="relative w-16 h-16 rounded-full overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C447C]"
          aria-label="Change profile photo"
          disabled={isPending}
        >
          {currentPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentPhoto}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#0C447C] flex items-center justify-center text-white text-[18px] font-medium">
              {userInitials}
            </div>
          )}

          {/* overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            {isPending ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : (
              <Camera size={18} className="text-white" />
            )}
          </div>
        </button>

        <div>
          <button
            type="button"
            onClick={() => !isPending && inputRef.current?.click()}
            disabled={isPending}
            className="text-[12px] font-medium text-[#0C447C] hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {isPending ? 'Uploading…' : 'Change photo'}
          </button>
          <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG or WEBP · max 5 MB</p>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden
      />
    </div>
  );
}
