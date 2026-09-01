"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions";
import type { SessionUser } from "@/lib/session";

export function NavBar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  // Purely cosmetic: the sticky header picks up a hairline border + shadow
  // once the page has scrolled, so it reads as "lifted" above content
  // instead of looking flat/stuck the whole time.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Role-conditional: a marketer-only/affiliate account has no use for the
  // review queue, and a reviewer-only account has nothing to submit — the
  // home page ("/") already adapts the same way (see src/app/page.tsx), so
  // the nav follows suit rather than linking to a page that would just
  // redirect back. Dashboard, unlike those two, is shown to any signed-in
  // user regardless of role — it's the same destination as the logo, just
  // named explicitly so it doesn't rely on people knowing that convention.
  const links = [
    ...(user ? [{ href: "/", label: "Dashboard" }] : []),
    ...(user?.is_marketer ? [{ href: "/submit", label: "Submit content" }] : []),
    ...(user?.is_reviewer ? [{ href: "/review", label: "Compliance review" }] : []),
  ];

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? "border-slate-200 shadow-sm" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold tracking-tight text-slate-900"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-teal-700 text-xs font-bold text-white shadow-sm transition-transform duration-150 group-hover:scale-105">
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
                        ? "rounded-md bg-teal-50 px-3 py-1.5 font-medium text-teal-700 transition-colors duration-150"
                        : "rounded-md px-3 py-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900"
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
                <button className="text-slate-500 transition-colors hover:text-slate-900 hover:underline">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900"
            >
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
