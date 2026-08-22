"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "目次" },
  { href: "/today", label: "今日" },
  { href: "/cook", label: "調理" },
  { href: "/recipes/new", label: "追加" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/cook")) {
    return null;
  }

  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gold bg-surface/95 backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-[720px] grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 flex-col items-center justify-center text-sm font-semibold"
            >
              <span
                className={`rounded-[0.65rem] px-3.5 py-1.5 transition-colors ${
                  active ? "bg-accent text-on-accent" : "text-ink-muted"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
