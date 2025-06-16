import type { Metadata } from "next";
import localFont from "next/font/local";

import { Modals } from "@/components/Modals";
import ReactQueryProvider from "@/components/react-query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./styles/globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Slack Clone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          <Toaster />
          <Modals />
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
