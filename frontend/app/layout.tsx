import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { StudioProvider } from "@/lib/rwa/studio-context";
import { SiteFooter, SiteHeader } from "@/components/rwa/SiteHeader";

// Self-hosted (bundled) so the container image builds with NO external network at build time —
// next/font/google fetches from Google Fonts during the build, which a mainland-China-region ACR
// build host can't reach. The woff2 lives in app/fonts/, so the Docker build is fully hermetic.
const inter = localFont({ src: "./fonts/Inter.woff2", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "RWA-DAO Creator Studio",
  title: "RWA-DAO Creator Studio",
  description:
    "Make content about RWA-DAO luxury watches in minutes: pick a watch, a creator and a style, generate, pay with token. Demo mode — for information only, not financial advice.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "RWA-DAO" },
  openGraph: {
    // Images come from the file-based convention (app/opengraph-image.tsx + per-page variants) —
    // don't set `images` here or it would shadow those branded cards for every route.
    title: "RWA-DAO Creator Studio",
    description: "Make content about RWA-DAO luxury watches in minutes.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RWA-DAO Creator Studio",
    description: "Make content about RWA-DAO luxury watches in minutes.",
  },
};

// Split from metadata per Next 14 — the browser UI / PWA theme color (matches the dark bg).
export const viewport: Viewport = {
  themeColor: "#0a0a12",
  width: "device-width",
  initialScale: 1,
};

// No-FOUC theme bootstrap: apply the saved (or default dark) theme before paint.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(!t)t='dark';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={`${inter.className} min-h-screen bg-bg text-fg antialiased`}>
        <StudioProvider>
          <SiteHeader />
          <main className="min-h-screen">{children}</main>
          <SiteFooter />
        </StudioProvider>
      </body>
    </html>
  );
}
