import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { Modals } from '@/components/modals';
import { ThemeProvider } from '@/components/providers/theme-provider';
import ReactQueryProvider from '@/components/react-query-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/auth/auth-provider';
import 'highlight.js/styles/github.css';
import 'quill/dist/quill.snow.css';
import './styles/globals.css';

const geistSans = localFont({
  src: './fonts/geist-vf.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/geist-mono-vf.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Pager - AI Powered Collaboration',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Analytics debug={false} />
        <ReactQueryProvider>
          <ReactQueryDevtools />
          <AuthProvider>
            <Toaster />
            <Modals />
            <ThemeProvider>
              <TooltipProvider delayDuration={50}>{children}</TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
