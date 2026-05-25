import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACAEP — TradeLens Assistant",
  description: "AI Codebase Assistant Evaluation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col">
        <nav className="shrink-0 border-b border-gray-200 bg-white px-6">
          <div className="mx-auto flex h-11 max-w-5xl items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              ACAEP
            </Link>
            <div className="flex gap-5 text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-900 transition-colors">Chat</Link>
              <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Runs</Link>
              <Link href="/eval/compare" className="hover:text-gray-900 transition-colors">Compare</Link>
            </div>
          </div>
        </nav>
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
