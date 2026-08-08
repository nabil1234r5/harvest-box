import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harvest Box — weekly produce from farms down the road",
  description:
    "A local food box service connecting neighbours directly to nearby farms. Real produce, picked this week, packed by the people who grew it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-linen/80 bg-cream/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-moss text-lg shadow-sm">
                🧺
              </span>
              <span className="font-display text-xl leading-none tracking-tight text-bark">
                Harvest Box
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-bark-soft">
                  Est. this season
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-1.5 text-bark-soft transition hover:bg-parchment hover:text-bark"
              >
                My box
              </Link>
              <Link
                href="/farm"
                className="rounded-full px-3 py-1.5 text-bark-soft transition hover:bg-parchment hover:text-bark"
              >
                Farms
              </Link>
              <Link
                href="/ops"
                className="rounded-full px-3 py-1.5 text-bark-soft transition hover:bg-parchment hover:text-bark"
              >
                Ops
              </Link>
              <Link
                href="/join"
                className="ml-1 rounded-full bg-clay px-4 py-1.5 font-semibold text-cream shadow-sm transition hover:bg-clay-dark"
              >
                Get a box
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-16 border-t border-linen bg-parchment/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-bark-soft sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-base text-bark">
              Harvest Box · packed Thursdays, delivered Fridays
            </p>
            <p>
              Three partner farms · Cedar Hollow, Marrow Ridge &amp; Dunmore
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
