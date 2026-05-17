'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { updateOfferSettingsAction } from '@/app/(app)/offers/actions';
import { DEFAULT_BACKGROUND_URL } from '@/types/offer';

interface Props {
  initialBackgroundUrl: string;
}

export function OfferSettingsForm({ initialBackgroundUrl }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [backgroundUrl, setBackground] = useState(initialBackgroundUrl);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await updateOfferSettingsAction({ backgroundUrl });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(new Date().toISOString());
      router.refresh();
    });
  }

  function useDefault() {
    setBackground(DEFAULT_BACKGROUND_URL);
  }

  return (
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle>Offer letters — page background</CardTitle>
          <CardDescription>
            One full-page A4 image with your letterhead, watermark, and footer baked in. It tiles
            across every page of every generated offer letter. The image should be A4-shaped
            (210mm × 297mm) — recommended ~2480 × 3508px PNG/JPG.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <Field
            label="Background image URL"
            hint="Public HTTPS URL. R2 / S3 / Firebase Storage / Drive direct links all work."
          >
            <div className="flex gap-2">
              <Input
                type="url"
                value={backgroundUrl}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="https://…/page-background.jpg"
                className="flex-1"
              />
              {backgroundUrl !== DEFAULT_BACKGROUND_URL && (
                <Button type="button" variant="outline" size="sm" onClick={useDefault}>
                  Use default
                </Button>
              )}
            </div>
          </Field>
          {backgroundUrl && (
            <div className="rounded-md border border-default bg-gray-50 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                Preview (scaled to fit)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundUrl}
                alt="Page background"
                className="block max-h-[400px] w-auto rounded shadow"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              {savedAt ? 'Saved.' : 'Changes apply to future letters & previews immediately.'}
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
