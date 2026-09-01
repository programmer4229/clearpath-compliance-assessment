import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { verifySession } from "@/lib/session";

export const metadata: Metadata = {
  title: "ClearPath Compliance Review",
  description: "Marketing compliance submission and review portal",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetched here (once per request, via verifySession()'s cache()) so the
  // NavBar — a Client Component, since it needs the current pathname for
  // active-link styling — can render the signed-in state without its own
  // client-side fetch/flash of unauthenticated content.
  const user = await verifySession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <NavBar user={user} />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-slate-400">
          ClearPath Financial — Compliance Review Portal (internal tool)
        </footer>
      </body>
    </html>
  );
}
