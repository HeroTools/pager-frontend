import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { Metadata } from 'next';
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
  title: 'Pager - AI First Team Chat',
  description: 'Open souce team chat with AI that learns from your conversations. Clean, fast, and yours to run however you need.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  keywords: ['team chat', 'collaboration', 'project management', 'AI assistant', 'workplace messaging'],
  authors: [{ name: 'Pager Team' }],
  creator: 'Pager',
  publisher: 'Pager',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://app.pager.team',
    siteName: 'Pager',
    title: 'Pager - AI First Team Chat',
    description: 'Open souce team chat with AI that learns from your conversations. Clean, fast, and yours to run however you need.',
    images: [
      {
        url: '/link_preview.png',
        width: 1200,
        height: 630,
        alt: 'Pager - AI First Team Chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pager - AI First Team Chat',
    description: 'Chat with your team, manage projects, and get AI help - all in one place. No more switching between apps.',
    images: ['/link_preview.png'],
    creator: '@pager',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
