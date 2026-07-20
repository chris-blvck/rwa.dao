import { ImageResponse } from "next/og";

// Shared Open Graph / Twitter card generator — one premium, on-brand 1200×630 card the whole app
// reuses (root + per-page variants pass their own eyebrow/title/subtitle). Self-contained: the
// gold-diamond motif is inline SVG and the type uses the default font, so no asset/font fetches.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BG = "#0a0a12";
const GOLD = "#e6c976";
const MUTED = "#9a9aa6";

export function ogCard({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "72px 80px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {/* Brand row: gold diamond mark (pure CSS — Satori has no SVG text) + wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ position: "relative", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", width: 34, height: 34, border: `3px solid ${GOLD}`, borderRadius: 7, transform: "rotate(45deg)" }} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: GOLD }}>R</div>
          </div>
          <div style={{ marginLeft: 18, fontSize: 30, fontWeight: 700, color: "#ffffff", letterSpacing: "0.06em" }}>RWA-DAO</div>
        </div>

        {/* Message block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{eyebrow}</div>
          <div style={{ marginTop: 20, fontSize: 68, fontWeight: 700, color: "#ffffff", lineHeight: 1.05, maxWidth: 940 }}>{title}</div>
          <div style={{ marginTop: 26, fontSize: 30, color: MUTED, lineHeight: 1.3, maxWidth: 900, fontFamily: "sans-serif" }}>{subtitle}</div>
        </div>

        {/* Footer accent */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 64, height: 4, background: GOLD, borderRadius: 4 }} />
          <div style={{ marginLeft: 20, fontSize: 22, color: MUTED, fontFamily: "sans-serif" }}>Luxury watches, on-chain · XDC</div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
