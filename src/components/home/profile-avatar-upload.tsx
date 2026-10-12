'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useAvatarUpload } from '@/components/settings/avatar-uploader';
import { useDialog } from '@/components/ui/modal';

interface Props {
  photoURL?: string | null;
  userInitials: string;
  avatarBg: string;
}

/**
 * Home profile-panel avatar. With a photo, clicking opens a small menu
 * (upload new / remove); without one, it goes straight to the file picker.
 */
export function ProfileAvatarUpload({ photoURL, userInitials, avatarBg }: Props) {
  const { error, isPending, openPicker, removePhoto, resolvePhoto, input } = useAvatarUpload();
  const { confirm, dialog } = useDialog();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const photo = resolvePhoto(photoURL);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function handleRemove() {
    setMenuOpen(false);
    const ok = await confirm({
      title: 'Remove profile photo?',
      body: 'Your initials will be shown instead. You can upload a new photo any time.',
      confirmLabel: 'Remove photo',
      intent: 'danger',
    });
    if (ok) removePhoto();
  }

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center gap-1.5">
      {dialog}
      <button
        type="button"
        onClick={() => (photo ? setMenuOpen((v) => !v) : openPicker())}
        disabled={isPending}
        aria-label={photo ? 'Profile photo options' : 'Upload profile photo'}
        aria-haspopup={photo ? 'menu' : undefined}
        aria-expanded={photo ? menuOpen : undefined}
        title={photo ? 'Change or remove photo' : 'Upload a profile photo'}
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

      {menuOpen && (
        <div
          role="menu"
          className="absolute left-1/2 top-[78px] z-20 w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              openPicker();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-slate-700 transition hover:bg-slate-50"
          >
            <ImagePlus className="h-4 w-4 text-slate-400" />
            Upload new photo
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleRemove}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Remove photo
          </button>
        </div>
      )}

      {error && <p className="max-w-[220px] text-center text-[11px] text-red-600">{error}</p>}
      {input}
    </div>
  );
}
