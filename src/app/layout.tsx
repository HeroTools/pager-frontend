import { Modals } from '@/components/modals';
import { ThemeProvider } from '@/components/providers/theme-provider';
import ReactQueryProvider from '@/components/react-query-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import 'highlight.js/styles/github.css';
import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import 'quill/dist/quill.snow.css';
import './styles/globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Pager - AI Powered Collaboration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSans.variable} antialiased`}>
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
