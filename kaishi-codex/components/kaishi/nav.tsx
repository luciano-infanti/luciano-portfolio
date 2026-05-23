"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Database, Layers3, Plus, Search } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Database },
  { href: "/add", label: "Quick Add", icon: Plus },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/cards", label: "Browser", icon: Search },
  { href: "/decks", label: "Decks", icon: Layers3 },
];

export function KaishiNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[var(--line)] bg-[rgba(24,24,27,0.86)] backdrop-blur">
      <div className="mx-auto flex min-h-14 w-[min(1180px,calc(100%-32px))] items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-3" aria-label="KAISHI dashboard">
          <span className="text-sm font-semibold tracking-normal text-zinc-100">KAISHI</span>
          <span className="kaishi-meta hidden sm:inline">Japanese SRS</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs transition-colors ${
                  active
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
