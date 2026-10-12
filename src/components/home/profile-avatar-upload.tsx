'use client';

import { Camera, Loader2 } from 'lucide-react';
import { useAvatarUpload } from '@/components/settings/avatar-uploader';

interface Props {
  photoURL?: string | null;
  userInitials: string;
  avatarBg: string;
}

/** Home profile-panel avatar — click (or tap) to upload a new profile photo. */
export function ProfileAvatarUpload({ photoURL, userInitials, avatarBg }: Props) {
  const { preview, error, isPending, openPicker, input } = useAvatarUpload();
  const photo = preview ?? photoURL;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={openPicker}
        disabled={isPending}
        aria-label="Change profile photo"
        title="Change profile photo"
        className="group relative rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C447C] focus-visible:ring-offset-2"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            referrerPolicy="no-referrer"
            className="w-[68px] h-[68px] rounded-2xl object-cover ring-[3px] ring-white shadow-lg"
          />
        ) : (
          <div
            className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center text-white text-[24px] font-bold ring-[3px] ring-white shadow-lg"
            style={{ background: avatarBg }}
          >
            {userInitials}
          </div>
        )}
        {/* Hover/tap overlay */}
        <span
          className={
            'absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 transition-opacity ' +
            (isPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100')
          }
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
        </span>
        {/* Small camera badge so it's discoverable on touch screens (no hover) */}
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#0C447C] shadow ring-1 ring-slate-200">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>
      {error && <p className="max-w-[220px] text-center text-[11px] text-red-600">{error}</p>}
      {input}
    </div>
  );
}
