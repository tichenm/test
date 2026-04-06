"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileNavProps = {
  isAuthenticated: boolean;
};

const items = [
  { href: "/", label: "Home" },
  { href: "/insights", label: "Insights" },
  { href: "/history", label: "History" },
  { href: "/account", label: "Account" },
];

export function MobileNav({ isAuthenticated }: MobileNavProps) {
  const pathname = usePathname();

  if (!isAuthenticated || pathname.startsWith("/interview/")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-center justify-between gap-3">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
