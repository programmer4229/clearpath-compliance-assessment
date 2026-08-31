import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearPath Compliance Review",
  description: "Marketing compliance submission and review portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              ClearPath <span className="text-slate-400">Compliance</span>
            </Link>
            <nav className="flex gap-6 text-sm text-slate-600">
              <Link href="/submit" className="hover:text-slate-900">
                Submit content
              </Link>
              <Link href="/status" className="hover:text-slate-900">
                Check status
              </Link>
              <Link href="/review" className="hover:text-slate-900">
                Compliance review
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
