'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateOfferSettingsAction } from '@/app/(app)/offers/actions';
import { DEFAULT_BACKGROUND_URL } from '@/types/offer';

interface Props {
  initialBackgroundUrl: string;
}

type Tab = 'url' | 'preview';

export function OfferLetterForm({ initialBackgroundUrl }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [backgroundUrl, setBackgroundUrl] = useState(initialBackgroundUrl);
  const [urlInput, setUrlInput] = useState(initialBackgroundUrl);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('url');
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDirty = urlInput !== backgroundUrl;
  const isDefault = backgroundUrl === DEFAULT_BACKGROUND_URL;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let url = urlInput.trim();
    if (!url) {
      setError('A background URL is required.');
      inputRef.current?.focus();
      return;
    }
    if (!url.startsWith('https://')) {
      setError('URL must start with https://');
      inputRef.current?.focus();
      return;
    }

    start(async () => {
      const res = await updateOfferSettingsAction({ backgroundUrl: url });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBackgroundUrl(url);
      setSavedAt(new Date());
      setImgError(false);
      router.refresh();
    });
  }

  function restoreDefault() {
    setUrlInput(DEFAULT_BACKGROUND_URL);
    setError(null);
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-slate-900">Offer letter</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Configure the page background applied to every generated offer letter.
        </p>
      </div>

      {/* Background image card */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Page background</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            One full-page A4 image with your letterhead, watermark, and footer baked in. It tiles
            across every page of every generated offer letter. Recommended: ~2480 × 3508 px PNG/JPG.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
              {error}
            </div>
          )}

          {/* Tab switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(['url', 'preview'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
                  tab === t
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {t === 'url' ? 'URL' : 'Preview'}
              </button>
            ))}
          </div>

          {tab === 'url' ? (
            <div className="space-y-2">
              <label className="block text-[12px] font-medium text-slate-600">
                Background image URL
              </label>
              <input
                ref={inputRef}
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setError(null);
                  setSavedAt(null);
                }}
                placeholder="https://…/page-background.jpg"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 focus:border-[#0C447C]/40 transition"
              />
              <p className="text-[11px] text-slate-400">
                Public HTTPS URL. R2, S3, Firebase Storage, or Drive direct links all work.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {backgroundUrl ? (
                imgError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
                    <ImageIcon className="h-8 w-8" />
                    <p className="text-[12px]">Could not load image. Check the URL.</p>
                    <a
                      href={backgroundUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#0C447C] underline"
                    >
                      Open URL <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="mb-2 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                      Scaled preview
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={backgroundUrl}
                      alt="Page background preview"
                      onError={() => setImgError(true)}
                      onLoad={() => setImgError(false)}
                      className="block max-h-[420px] w-auto rounded shadow"
                    />
                  </>
                )
              ) : (
                <div className="flex items-center justify-center py-8 text-[12px] text-slate-400">
                  No URL set yet.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-white/90 backdrop-blur border-t border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {savedAt ? (
            <span className="text-[12px] text-emerald-600 font-medium">
              Saved {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : isDirty ? (
            <span className="text-[12px] text-amber-600">Unsaved changes</span>
          ) : (
            <span className="text-[12px] text-slate-400">
              Changes apply to future letters immediately.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <Button type="button" variant="ghost" size="sm" onClick={restoreDefault}>
              <RotateCcw className="h-3.5 w-3.5" />
              Use default
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending || !isDirty}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
