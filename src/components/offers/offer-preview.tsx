'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { buildRenderContext, renderTemplate } from '@/lib/offers/render';
import type { OfferData } from '@/types/offer';

interface Props {
  data: OfferData;
  /** Single full-A4 image: header + watermark + footer baked in. */
  backgroundUrl: string;
}

/** CSS pixel ↔ mm. Browsers render `1mm` = 96 / 25.4 ≈ 3.7795 CSS px regardless
 *  of physical screen DPI, so we can use this constant safely on screen. */
const PX_PER_MM = 96 / 25.4;

/** Padding values must mirror the CSS custom props in globals.css. */
const PAD_TOP_MM = 50;
const PAD_BOTTOM_MM = 38;
const PAGE_HEIGHT_MM = 297;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - PAD_TOP_MM - PAD_BOTTOM_MM; // 209
const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * PX_PER_MM;

const MARKDOWN_COMPONENTS = {
  h1: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mt-2 text-xl font-bold" {...p} />
  ),
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mt-5 text-lg font-bold" {...p} />
  ),
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-4 text-base font-bold" {...p} />
  ),
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-2.5 leading-relaxed" {...p} />
  ),
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-2 list-disc pl-6 leading-relaxed" {...p} />
  ),
  ol: (p: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="my-2 list-decimal pl-6 leading-relaxed" {...p} />
  ),
  li: (p: React.LiHTMLAttributes<HTMLLIElement>) => <li className="my-1" {...p} />,
  strong: (p: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold" {...p} />
  ),
  table: (p: React.HTMLAttributes<HTMLTableElement>) => (
    <table
      className="my-4 w-full border-collapse text-sm [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1"
      {...p}
    />
  ),
  hr: () => <hr className="my-6 border-gray-300" />,
};

/**
 * Live-paginated A4 preview.
 *
 * Two passes:
 *   1. Render the substituted Markdown into a hidden, off-screen "measure"
 *      container that has the same width + typography as the visible body.
 *   2. After mount (in `useLayoutEffect`, before the browser paints), walk
 *      the measure container's top-level children, group them into pages of
 *      ~209mm each (the safe-zone height between header & footer artwork),
 *      and render N visible `<div className="offer-page">` wrappers — each
 *      with the letterhead `<img>` as background and a slice of the body.
 *
 * Why an `<img>` instead of `background-image`: Chrome / Safari strip
 * `background-image` from print output unless the user manually ticks
 * "Background graphics" in the print dialog. `<img>` always prints.
 */
export function OfferPreview({ data, backgroundUrl }: Props) {
  const rendered = useMemo(() => {
    const ctx = buildRenderContext(data);
    return renderTemplate(data.bodyMarkdown, ctx);
  }, [data]);

  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>(['']);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) {
      setPages(['']);
      return;
    }
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) {
      setPages(['']);
      return;
    }

    const groups: HTMLElement[][] = [[]];
    // offsetTop is relative to the offsetParent — `measureRef.current` itself
    // (which is positioned). So child.offsetTop tells us where each block
    // sits inside the measure container.
    let pageStartTop = children[0].offsetTop;

    for (const child of children) {
      const childTop = child.offsetTop;
      const childBottom = childTop + child.offsetHeight;

      const wouldOverflow =
        childBottom - pageStartTop > CONTENT_HEIGHT_PX &&
        groups[groups.length - 1].length > 0;

      if (wouldOverflow) {
        groups.push([]);
        pageStartTop = childTop;
      }
      groups[groups.length - 1].push(child);
    }

    const html = groups
      .filter((g) => g.length > 0)
      .map((g) => g.map((node) => node.outerHTML).join(''));
    setPages(html.length > 0 ? html : ['']);
  }, [rendered]);

  return (
    <>
      {/* Hidden measurement layer — must mirror visible body's width + typography
       *  so children's offsetHeight reflects what they'll be when rendered. */}
      <div className="offer-measure offer-content" ref={measureRef} aria-hidden>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {rendered}
        </ReactMarkdown>
      </div>

      {/* Visible paginated A4 pages */}
      <div className="offer-pages">
        {pages.map((html, i) => (
          <div key={i} className="offer-page shadow-sm print:shadow-none">
            {backgroundUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                /* Always served via our same-origin proxy so html2canvas
                 * can read the pixels back during PDF export and we don't
                 * depend on the upstream CDN's CORS config. The proxy
                 * route at /api/offers/bg-image reads the configured
                 * URL server-side and streams the bytes back. */
                src="/api/offers/bg-image"
                alt=""
                aria-hidden
                className="offer-page-bg"
              />
            ) : (
              <div className="offer-page-bg flex items-center justify-center text-xs text-gray-400">
                No background — set one in Settings → Offer letters
              </div>
            )}
            <article
              className="offer-body offer-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="offer-page-counter no-print">
              Page {i + 1} of {pages.length}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
