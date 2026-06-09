import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bosscoder Workspace',
    template: '%s · Bosscoder Workspace',
  },
  description:
    'Bosscoder Workspace — employee directory, performance evaluations, and review cycles. ' +
    'Access restricted to authorized employees on @bosscoderacademy.com accounts.',
  applicationName: 'Bosscoder Workspace',
  authors: [{ name: 'Bosscoder Academy' }],
  keywords: [
    'Bosscoder Workspace',
    'performance review',
    'employee directory',
    'internal portal',
  ],
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/bosscoder-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/bosscoder-icon.svg',
  },
  openGraph: {
    title: 'Bosscoder Workspace',
    description:
      'Bosscoder Workspace — employee directory and performance evaluations.',
    type: 'website',
    siteName: 'Bosscoder Workspace',
  },
};

export const viewport: Viewport = {
  themeColor: '#1f43ed',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen antialiased"
        suppressHydrationWarning
      >
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
