/**
 * Client-side PDF export.
 *
 * Why not `window.print()`? Browser print engines size pages from the
 * intrinsic dimensions of `<img>` children, ignore `object-fit` during
 * pagination, and respect the user's "Background graphics" toggle — all of
 * which produced inconsistent output (extra blank pages, missing letterhead,
 * 4-page PDFs from a 1-page preview).
 *
 * Instead: capture each rendered `.offer-page` as a pixel canvas via
 * html2canvas, then place each canvas as a single A4 image in a jsPDF doc.
 * What you see on screen is exactly what lands in the PDF — no print-engine
 * surprises, no browser variability.
 *
 * Trade-off: text in the PDF is rasterized (not selectable). For offer
 * letters that get printed → signed → scanned anyway, this is fine.
 */

export interface DownloadResult {
  ok: boolean;
  error?: string;
  pages?: number;
}

export interface DownloadArgs {
  filename: string;
  /** Selector for each page element. Defaults to `.offer-page`. */
  pageSelector?: string;
  /** CSS selector(s) to drop from the canvas before capture (e.g. screen-only
   *  page counters that shouldn't appear in the PDF). */
  ignoreSelectors?: string[];
}

const DEFAULT_IGNORE = [
  '.no-print',
  '.offer-page-counter',
];

interface BuiltPdf {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;
  pages: number;
}

async function buildOfferPdf(args: {
  pageSelector?: string;
  ignoreSelectors?: string[];
}): Promise<BuiltPdf> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const selector = args.pageSelector ?? '.offer-page';
  const pages = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (pages.length === 0) {
    throw new Error('No offer page elements found to export.');
  }

  const ignore = [...DEFAULT_IGNORE, ...(args.ignoreSelectors ?? [])];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];

    // Wait for any in-flight images on this page to finish loading. Without
    // this, the bg image can be half-decoded when html2canvas snapshots,
    // resulting in a PDF page with no letterhead.
    await waitForImages(el);

    const canvas = await html2canvas(el, {
      useCORS: true,
      allowTaint: false,
      scale: 2, // 2× retina for crisp text
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (node) => {
        if (!(node instanceof HTMLElement)) return false;
        return ignore.some((sel) => node.matches?.(sel));
      },
    });

    if (i > 0) pdf.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    // Place the captured canvas as a single A4-sized image. width/height
    // in mm (jsPDF unit) — 210 × 297 = the standard A4 portrait.
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  return { doc: pdf, pages: pages.length };
}

export async function downloadOfferPdf(args: DownloadArgs): Promise<DownloadResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'PDF export only works in the browser.' };
  }
  try {
    const { doc, pages } = await buildOfferPdf(args);
    doc.save(`${args.filename}.pdf`);
    return { ok: true, pages };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to generate PDF',
    };
  }
}

export interface GeneratePdfResult {
  ok: boolean;
  error?: string;
  base64?: string;
}

/** Same rendering path as downloadOfferPdf, but returns raw base64 bytes
 *  instead of triggering a browser download — used to attach the PDF to an
 *  outbound email without ever writing it to disk. */
export async function generateOfferPdfBase64(args: {
  pageSelector?: string;
  ignoreSelectors?: string[];
}): Promise<GeneratePdfResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'PDF export only works in the browser.' };
  }
  try {
    const { doc } = await buildOfferPdf(args);
    const base64 = doc.output('datauristring').split(',')[1];
    return { ok: true, base64 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to generate PDF',
    };
  }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          // Safety timeout — never block the export indefinitely.
          setTimeout(done, 5000);
        })
    )
  );
}

/** Sanitize a string for use as a filename. */
export function safeFilename(s: string): string {
  return (
    s
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'offer'
  );
}
