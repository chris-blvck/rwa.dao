"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { DEV_LIVE_MODE_ENABLED, useStudio } from "@/lib/rwa/studio-context";

const NAV = [
  { href: "/studio", label: "Studio" },
  { href: "/mint", label: "Mint" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function SiteHeader() {
  const s = useStudio();
  const pathname = usePathname();
  // The 5-item nav overflows narrow phones, so it scrolls horizontally. Keep the current page's
  // tab in view and show edge fades so the scroll reads as intentional (not a clipped word).
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    if (active) el.scrollTo({ left: Math.max(0, active.offsetLeft - 16), behavior: "smooth" });
    syncEdges();
  }, [pathname, syncEdges]);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <>
      <Brand
        credits={s.mounted ? s.credits : undefined}
        mode={s.uiMode}
        devLiveMode={DEV_LIVE_MODE_ENABLED}
        walletAddress={s.wallet?.address}
        onConnectWallet={s.connectWallet}
        onDisconnectWallet={s.disconnectWallet}
        connecting={s.busy === "wallet"}
      />
      <nav className="sticky top-[57px] z-10 border-b border-line bg-bg/90 backdrop-blur" aria-label="Primary">
        <div className="relative mx-auto max-w-6xl">
          <div
            ref={scrollerRef}
            onScroll={syncEdges}
            className="flex items-center gap-1 overflow-x-auto px-5 py-2 sm:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[{ href: "/", label: "Home" }, ...NAV].map((n) => {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                    active ? "bg-fg text-bg" : "text-fgMuted hover:text-fg",
                  ].join(" ")}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
          <div
            className={["pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-bg to-transparent transition-opacity sm:hidden", edges.left ? "opacity-100" : "opacity-0"].join(" ")}
          />
          <div
            className={["pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg to-transparent transition-opacity sm:hidden", edges.right ? "opacity-100" : "opacity-0"].join(" ")}
          />
        </div>
      </nav>
    </>
  );
}

export function SiteFooter() {
  const s = useStudio();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-[11px] text-fgMuted sm:px-8">
        <span>
          RWA-DAO Creator Studio · For information only — not financial advice. ·{" "}
          <Link href="/hackathon" className="font-semibold text-fgSoft underline underline-offset-4 hover:text-fg">
            Hackathon judge tour
          </Link>
        </span>
        {DEV_LIVE_MODE_ENABLED ? (
          <span className="flex items-center gap-2" aria-label="Dev admin backend mode">
            <span className="text-fgMuted">dev/admin</span>
            <button type="button" onClick={() => s.setMode("canned")} aria-pressed={s.uiMode === "canned"} className={s.uiMode === "canned" ? "font-semibold text-fg" : "hover:text-fg"}>
              demo
            </button>
            <span>/</span>
            <button type="button" onClick={() => s.setMode("live")} aria-pressed={s.uiMode === "live"} className={s.uiMode === "live" ? "font-semibold text-fg" : "hover:text-fg"}>
              live
            </button>
          </span>
        ) : (
          <span className="font-semibold text-fg">demo</span>
        )}
      </div>
    </footer>
  );
}
