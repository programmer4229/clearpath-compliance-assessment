"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
import type { SessionUser } from "@/lib/session";

export function NavBar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  // Role-conditional: a marketer-only/affiliate account has no use for the
  // review queue, and a reviewer-only account has nothing to submit — the
  // home page ("/") already adapts the same way (see src/app/page.tsx), so
  // the nav follows suit rather than linking to a page that would just
  // redirect back.
  const links = [
    ...(user?.is_marketer ? [{ href: "/submit", label: "Submit content" }] : []),
    ...(user?.is_reviewer ? [{ href: "/review", label: "Compliance review" }] : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            CP
          </span>
          ClearPath <span className="font-normal text-slate-400">Compliance</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <nav className="flex gap-1 text-sm">
              {links.map((link) => {
                const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      active
                        ? "rounded-md bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700"
                        : "rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4 text-sm">
              <span className="text-slate-500">
                <span className="font-medium text-slate-900">{user.name}</span>
              </span>
              <form action={logoutAction}>
                <button className="text-slate-500 hover:text-slate-900 hover:underline">Sign out</button>
              </form>
            </div>
          </div>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary px-3 py-1.5 text-sm">
              Create account
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
