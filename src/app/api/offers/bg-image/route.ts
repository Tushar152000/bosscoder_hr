import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getCurrentUser } from '@/lib/auth/session';
import { getOfferSettings } from '@/lib/firestore/hr-settings';

// The configured letterhead asset (Creative 1.jpg) has ~2.9% of blank canvas
// baked in above the header artwork. Cropping it here (once, server-side)
// means every consumer — the live preview AND html2canvas's PDF export —
// gets identical, already-correct pixels. Doing this via CSS positioning
// instead is fragile: html2canvas doesn't reliably replicate a browser's
// negative-offset + overflow:hidden clipping, which is what caused the
// header to render correctly on-screen but show a white gap in the PDF.
const CROP_TOP_FRACTION = 0.0291;

/**
 * Same-origin proxy for the offer-letter background image.
 *
 * Why this exists: the configured `backgroundUrl` (typically a Cloudflare
 * R2 public URL) doesn't return CORS headers by default. Setting
 * `<img crossOrigin="anonymous">` makes the browser refuse to load such
 * images at all, and not setting it makes the canvas tainted so html2canvas
 * (used for PDF export) can't read pixels back. Solving both with this
 * proxy: the server fetches the upstream image and returns it same-origin,
 * so the browser sees no cross-origin boundary either way.
 *
 * Auth: only signed-in portal users can hit this route — keeps the
 * letterhead artwork out of public reach.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const settings = await getOfferSettings();
  const url = settings.backgroundUrl;
  if (!url) return new NextResponse('No background configured', { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      // We don't need cookies on the upstream — these are public CDN URLs.
      // But we do want a sane default UA so picky CDNs don't 403 us.
      headers: { 'User-Agent': 'BosscoderWorkspace/1.0 (offer-letter-proxy)' },
      cache: 'no-store',
    });
  } catch (e) {
    return new NextResponse(
      `Failed to fetch background: ${e instanceof Error ? e.message : 'unknown'}`,
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    return new NextResponse(`Upstream returned ${upstream.status}`, {
      status: 502,
    });
  }

  const original = Buffer.from(await upstream.arrayBuffer());
  const contentType =
    upstream.headers.get('content-type') ?? 'application/octet-stream';

  let output: Buffer = original;
  try {
    const img = sharp(original);
    const meta = await img.metadata();
    if (meta.width && meta.height) {
      const cropTop = Math.round(meta.height * CROP_TOP_FRACTION);
      output = await img
        .extract({ left: 0, top: cropTop, width: meta.width, height: meta.height - cropTop })
        .toBuffer();
    }
  } catch {
    // If cropping fails for any reason, serve the untouched original rather
    // than breaking the letterhead entirely.
    output = original;
  }

  return new NextResponse(new Uint8Array(output), {
    headers: {
      'Content-Type': contentType,
      // Cache in the user's browser briefly. The image rarely changes; if
      // settings updates, a hard reload picks it up. Private so any shared
      // CDN doesn't store per-user copies.
      'Cache-Control': 'private, max-age=300',
    },
  });
}
