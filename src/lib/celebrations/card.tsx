import 'server-only';
import { readFile } from 'fs/promises';
import path from 'path';
import { ImageResponse } from 'next/og';
import type { CelebrationKind } from './message';

/**
 * The square "Bosscoder Academy wishes you" card attached to celebration posts —
 * rendered server-side (Satori via next/og) from the person's photo, name and title.
 */

export const CARD_SIZE = 1080;

const NAVY = '#0F2368';
const BLUE = '#2350B8';
const STEEL_A = '#1E4F8F';
const STEEL_B = '#4C93C6';

export interface CardInput {
  kind: CelebrationKind;
  name: string;
  designation: string;
  years: number;
  /** data: URL of the photo (PNG/JPEG); null ⇒ initials. */
  photo: string | null;
}

/** Heavy condensed face for the anniversary headline and name. */
const DISPLAY_FONT_FILE = 'anton-latin-400-normal.ttf';

const publicFile = (...p: string[]) => readFile(path.join(process.cwd(), 'public', ...p));

type Fonts = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'];
let assets: Promise<{ fonts: Fonts; logo: string }> | null = null;

function loadAssets() {
  assets ??= Promise.all([
    publicFile('fonts', 'montserrat-latin-700-normal.ttf'),
    publicFile('fonts', 'montserrat-latin-700-italic.ttf'),
    publicFile('fonts', 'montserrat-latin-800-normal.ttf'),
    publicFile('fonts', 'montserrat-latin-900-normal.ttf'),
    publicFile('fonts', DISPLAY_FONT_FILE),
    publicFile('bosscoder-icon.svg'),
  ]).then(([w700, w700i, w800, w900, display, logo]) => ({
    fonts: [
      { name: 'Montserrat', data: w700, weight: 700 as const, style: 'normal' as const },
      { name: 'Montserrat', data: w700i, weight: 700 as const, style: 'italic' as const },
      { name: 'Montserrat', data: w800, weight: 800 as const, style: 'normal' as const },
      { name: 'Montserrat', data: w900, weight: 900 as const, style: 'normal' as const },
      { name: 'Display', data: display, weight: 400 as const, style: 'normal' as const },
    ],
    logo: `data:image/svg+xml;base64,${logo.toString('base64')}`,
  }));
  // Don't cache a failed read forever.
  assets.catch(() => { assets = null; });
  return assets;
}

/** Fetch a profile photo as a data: URL, asking Google for a large size. Null on any failure. */
export async function photoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  const big = /googleusercontent\.com\//.test(url) ? url.replace(/=s\d+(-c)?$/, '') + '=s800-c' : url;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(big, { signal: ctrl.signal, headers: { Accept: 'image/jpeg,image/png' } });
    const type = res.headers.get('content-type')?.split(';')[0] ?? '';
    if (!res.ok || !/^image\/(jpeg|png)$/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('');
}

export async function renderCelebrationCard(input: CardInput): Promise<Buffer> {
  const { fonts, logo } = await loadAssets();
  const card = input.kind === 'birthday' ? birthdayCard(input, logo) : anniversaryCard(input, logo);
  const res = new ImageResponse(card, { width: CARD_SIZE, height: CARD_SIZE, fonts });
  if (!res.ok) throw new Error(`Card render failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Straight navy/steel corner bands, round photo, name + title underneath. */
function birthdayCard(input: CardInput, logo: string) {
  const S = CARD_SIZE;
  const PHOTO = 470;

  const dots = (x: number, y: number) => (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', flexWrap: 'wrap', width: 96, gap: 10 }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: '#2E6A9A' }} />
      ))}
    </div>
  );

  return (
      <div
        style={{
          width: S, height: S, display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', fontFamily: 'Montserrat',
          background: 'linear-gradient(135deg, #F4F8FF 0%, #EAF2FE 55%, #DCE8FA 100%)',
        }}
      >
        {/* Top: navy band with a steel-blue corner, split by a white diagonal */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: S, height: 40, background: NAVY, clipPath: 'polygon(0px 0px, 820px 0px, 790px 40px, 0px 40px)' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, width: 300, height: 110, background: `linear-gradient(90deg, ${STEEL_A}, ${STEEL_B})`, clipPath: 'polygon(60px 0px, 300px 0px, 300px 110px, 150px 110px)' }} />
        {/* Bottom: steel-blue corner and navy band, mirrored */}
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: 300, height: 110, background: `linear-gradient(90deg, ${STEEL_B}, ${STEEL_A})`, clipPath: 'polygon(0px 0px, 150px 0px, 240px 110px, 0px 110px)' }} />
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: S, height: 40, background: NAVY, clipPath: 'polygon(262px 0px, 1080px 0px, 1080px 40px, 292px 40px)' }} />
        {/* Bottom-right dot grids + navy discs */}
        {dots(880, 850)}
        {dots(960, 920)}
        <div style={{ position: 'absolute', left: 968, top: 842, width: 64, height: 64, borderRadius: 32, background: NAVY }} />
        <div style={{ position: 'absolute', left: 890, top: 928, width: 64, height: 64, borderRadius: 32, background: NAVY }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 92, gap: 22 }}>
          <img src={logo} width={92} height={92} alt="" />
          <div style={{ fontSize: 60, fontWeight: 900, color: BLUE, letterSpacing: -1, textShadow: '0 3px 0 rgba(15,35,104,0.28)' }}>
            BOSSCODER ACADEMY
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: '#0B0B0B', letterSpacing: 1 }}>
          WISHES YOU
        </div>
        <div style={{ marginTop: 2, fontSize: 70, fontWeight: 900, color: BLUE, letterSpacing: -1, textShadow: '0 3px 0 rgba(15,35,104,0.28)' }}>
          HAPPY BIRTHDAY
        </div>

        {/* Photo */}
        <div
          style={{
            marginTop: 26, width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2, border: `14px solid ${BLUE}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            background: `linear-gradient(135deg, ${NAVY}, ${BLUE})`, boxShadow: '0 12px 30px rgba(15,35,104,0.25)',
          }}
        >
          {input.photo ? (
            <img src={input.photo} width={PHOTO - 28} height={PHOTO - 28} style={{ objectFit: 'cover' }} alt="" />
          ) : (
            <div style={{ fontSize: 150, fontWeight: 800, color: 'white' }}>{initialsOf(input.name)}</div>
          )}
        </div>

        {/* Name + title */}
        <div style={{ marginTop: 40, fontSize: 42, fontWeight: 800, color: '#0B0B0B', textAlign: 'center', maxWidth: 760, textShadow: '0 2px 0 rgba(0,0,0,0.12)' }}>
          {input.name.toUpperCase()}
        </div>
        {input.designation && (
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: '#1A1A1A', textAlign: 'center', maxWidth: 720 }}>
            {`(${input.designation.toUpperCase()})`}
          </div>
        )}
      </div>
  );
}

/** "3rd" — English ordinal for the anniversary headline. */
function ordinal(n: number): { num: string; suffix: string } {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return { num: String(n), suffix };
}

const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

/** Wavy navy blobs (top-right, bottom-left, bottom-right) with a lighter blue rim. */
const WAVES = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A5DB4"/><stop offset="1" stop-color="#0B2F73"/></linearGradient>
    <linearGradient id="m" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A5DB4"/><stop offset="1" stop-color="#0B2F73"/></linearGradient>
  </defs>
  <path fill="#2F7FDB" d="M190 0 C 300 60 470 70 640 52 C 800 36 930 40 985 120 C 1035 195 960 300 1000 380 C 1025 425 1055 445 1080 455 L1080 0 Z"/>
  <path fill="url(#n)" d="M235 0 C 330 40 480 48 640 32 C 790 18 910 22 958 95 C 1005 168 935 280 975 360 C 1000 405 1040 425 1080 432 L1080 0 Z"/>
  <path fill="#2F7FDB" d="M0 610 C 110 600 185 680 200 780 C 215 880 300 950 440 975 C 570 998 700 1030 790 1080 L0 1080 Z"/>
  <path fill="url(#m)" d="M0 642 C 95 640 155 715 168 805 C 182 905 280 985 420 1005 C 545 1022 650 1050 720 1080 L0 1080 Z"/>
  <path fill="#2F7FDB" d="M760 1080 C 850 1035 960 1045 1030 1010 C 1050 1000 1066 990 1080 978 L1080 1080 Z"/>
  <path fill="url(#n)" d="M820 1080 C 900 1052 980 1058 1040 1032 C 1056 1025 1069 1017 1080 1008 L1080 1080 Z"/>
</svg>`);

/** The "3rd Work Anniversary" card: wavy blobs, big round photo, name in a blue pill. */
function anniversaryCard(input: CardInput, logo: string) {
  const S = CARD_SIZE;
  const PHOTO = 560;
  const INK = '#1557A8';
  const { num, suffix } = ordinal(Math.max(1, input.years));
  // Hollow digits: background-coloured text ringed by ink shadows (Satori has no text-stroke).
  const outline = (w: number) => ({
    color: '#EEF5FD',
    textShadow: [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]
      .map(([x, y]) => `${x! * w}px ${y! * w}px 0 ${INK}`)
      .join(', '),
  });

  const dots = (x: number, y: number) => (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', flexWrap: 'wrap', width: 64, gap: 8 }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: '#1F6FEB' }} />
      ))}
    </div>
  );

  return (
    <div style={{ width: S, height: S, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', fontFamily: 'Montserrat', background: '#EEF5FD' }}>
      <img src={WAVES} width={S} height={S} style={{ position: 'absolute', left: 0, top: 0 }} alt="" />
      <img src={logo} width={88} height={88} style={{ position: 'absolute', left: 24, top: 18 }} alt="" />

      {/* Bottom-right dots + discs */}
      {dots(924, 930)}
      <div style={{ position: 'absolute', left: 994, top: 930, width: 54, height: 54, borderRadius: 27, background: '#0F2A6B' }} />
      <div style={{ position: 'absolute', left: 924, top: 970, width: 54, height: 54, borderRadius: 27, background: '#0F2A6B' }} />
      {dots(994, 976)}

      <div style={{ marginTop: 128, fontSize: 30, fontWeight: 800, color: INK, letterSpacing: -0.5 }}>BOSSCODER ACADEMY</div>
      <div style={{ marginTop: 16, fontSize: 21, fontWeight: 700, fontStyle: 'italic', color: '#0B0B0B' }}>WISHES YOU</div>

      {/* 3rd Work Anniversary */}
      <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 4, fontFamily: 'Display' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 112, lineHeight: 1, ...outline(3) }}>{num}</div>
          <div style={{ fontSize: 40, lineHeight: 1, marginTop: 2, marginLeft: 2, ...outline(2) }}>{suffix}</div>
        </div>
        <div style={{ fontSize: 66, lineHeight: 1, marginLeft: 18, marginBottom: 4, color: INK, letterSpacing: 1, textShadow: '0 3px 0 rgba(11,47,115,0.25)' }}>
          Work Anniversary
        </div>
      </div>

      {/* Photo with the name pill overlapping its bottom edge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 36 }}>
        <div
          style={{
            width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2, border: '14px solid #1C64B4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            background: 'linear-gradient(135deg, #0B2F73, #1C64B4)',
          }}
        >
          {input.photo ? (
            <img src={input.photo} width={PHOTO - 28} height={PHOTO - 28} style={{ objectFit: 'cover' }} alt="" />
          ) : (
            <div style={{ fontSize: 170, fontWeight: 800, color: 'white' }}>{initialsOf(input.name)}</div>
          )}
        </div>
        <div
          style={{
            marginTop: -150, minWidth: 520, maxWidth: 760, padding: '20px 40px 24px', borderRadius: 44,
            background: '#4A93E4', display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          <div style={{ fontFamily: 'Display', fontSize: 52, lineHeight: 1.1, color: 'white', letterSpacing: 0.5, textShadow: '3px 3px 0 #0B1F3A', textAlign: 'center' }}>
            {input.name.toUpperCase()}
          </div>
          {input.designation && (
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: 'white', textShadow: '2px 2px 0 #0B1F3A', textAlign: 'center' }}>
              {`(${input.designation.toUpperCase()})`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
