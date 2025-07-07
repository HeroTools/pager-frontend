import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Modals } from '@/components/modals';
import ReactQueryProvider from '@/components/react-query-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth/auth-provider';
import './styles/globals.css';
import 'quill/dist/quill.snow.css';
import 'highlight.js/styles/github.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

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
  title: 'Unowned',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ReactQueryProvider>
          <ReactQueryDevtools />
          <AuthProvider>
            <NuqsAdapter>
              <Toaster />
              <Modals />
              <ThemeProvider>
                <TooltipProvider delayDuration={50}>{children}</TooltipProvider>
              </ThemeProvider>
            </NuqsAdapter>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
