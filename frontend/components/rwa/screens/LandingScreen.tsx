"use client";

import Image from "next/image";
import Link from "next/link";
import { formatEther } from "viem";
import { Button } from "@/components/ui/Button";
import { useStudio } from "@/lib/rwa/studio-context";

const EXPLORE = [
  { href: "/studio", title: "Studio", desc: "Compose & generate your watch video with AI." },
  { href: "/mint", title: "Mint", desc: "Own a fraction of a real vaulted watch — live on-chain." },
  { href: "/dashboard", title: "Dashboard", desc: "Your videos, your agent, and the mints you drive." },
  { href: "/leaderboard", title: "Leaderboard", desc: "Top posts earn token rewards." },
];

export function LandingScreen() {
  const s = useStudio();
  const { watch } = s;
  return (
    <>
      <section className="fade-up mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <div className="eyebrow text-fgMuted">Creator Studio</div>
            <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-tightest text-fg sm:text-5xl lg:text-6xl">
              Make content about RWA-DAO luxury watches in minutes.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fgSoft">
              Pick a watch, a creator and a style — pay with token, then generate. No editing skills, no AI knowledge needed.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link href="/studio"><Button>Get started</Button></Link>
              {s.wallet ? <span className="text-sm text-fgMuted">{s.shortAddr}</span> : null}
            </div>
            {s.mintState ? (
              <div className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-line2 bg-bg2 px-4 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live on XDC Apothem
                </span>
                <span className="text-fgMuted">{Number(s.mintState.totalSupply).toLocaleString("en-US")} fractions minted</span>
                <span className="text-line2">·</span>
                <span className="text-fgMuted">{Number(formatEther(BigInt(s.mintState.priceXdcWei))).toLocaleString("en-US", { maximumFractionDigits: 3 })} XDC / fraction</span>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-3xl border border-line bg-black">
            <Image src={watch.image} alt={watch.title} width={520} height={693} priority className="h-auto w-full" />
            <div className="px-4 py-3 text-center">
              <div className="eyebrow text-white/60">{watch.title}</div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Connect", "Connect your wallet — demo mode, nothing is charged."],
            ["2", "Compose", "Pick a watch, a creator, a style and a scene."],
            ["3", "Generate", "Generate your video — it saves to your library automatically."],
            ["4", "Post & earn", "Post it, submit the link — top creators earn token rewards."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border border-line bg-bg2 p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-line2 text-sm font-bold text-fg">{n}</div>
              <div className="mt-3 font-semibold text-fg">{t}</div>
              <p className="mt-1 text-sm text-fgMuted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Explore the rest of the product */}
      <section className="fade-up mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20">
        <div className="eyebrow text-fgMuted">Explore</div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">Everything in one place</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map((e) => (
            <Link key={e.href} href={e.href} className="group rounded-2xl border border-line bg-bg2 p-5 transition-colors hover:border-fg">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-fg">{e.title}</div>
                <span className="text-fgMuted transition-transform group-hover:translate-x-0.5">→</span>
              </div>
              <p className="mt-1 text-sm text-fgMuted">{e.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
