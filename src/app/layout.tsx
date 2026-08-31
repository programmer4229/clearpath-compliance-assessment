import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "ClearPath Compliance Review",
  description: "Marketing compliance submission and review portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <NavBar />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-slate-400">
          ClearPath Financial — Compliance Review Portal (internal tool)
        </footer>
      </body>
    </html>
  );
}
