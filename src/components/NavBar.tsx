"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/submit", label: "Submit content" },
  { href: "/status", label: "Check status" },
  { href: "/review", label: "Compliance review" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            CP
          </span>
          ClearPath <span className="font-normal text-slate-400">Compliance</span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((link) => {
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
      </div>
    </header>
  );
}
