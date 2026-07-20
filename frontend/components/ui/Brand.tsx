import { Badge } from "./Badge";
import { ThemeToggle } from "./ThemeToggle";
import type { RwaMode } from "@/lib/rwa/types";

export function Brand({
  credits,
  mode = "canned",
  devLiveMode = false,
  walletAddress,
  onConnectWallet,
  onDisconnectWallet,
  connecting = false,
}: {
  credits?: number;
  mode?: RwaMode;
  devLiveMode?: boolean;
  walletAddress?: string;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
  connecting?: boolean;
}) {
  const modeLabel = devLiveMode && mode === "live" ? "Dev live" : "Demo";
  const creditsModeLabel = devLiveMode && mode === "live" ? "XDC · dev" : "XDC · demo";
  const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <span className="text-xl font-black tracking-tightest text-fg">RWA-DAO</span>
        <div className="flex items-center gap-3">
          {typeof credits === "number" ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-line2 px-3 py-1 text-xs font-semibold text-fg sm:inline-flex">
              <span className="text-fgMuted">◆</span>
              {credits} <span className="font-normal text-fgMuted">{creditsModeLabel}</span>
            </span>
          ) : null}
          {onConnectWallet ? (
            walletAddress ? (
              <button
                type="button"
                onClick={onDisconnectWallet}
                title="Disconnect wallet"
                aria-label={`Wallet ${shortAddr} — click to disconnect`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-line2 px-3 py-1 text-xs font-semibold text-fg transition-colors hover:border-fg"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 group-hover:hidden" />
                <span className="hidden text-fgMuted group-hover:inline" aria-hidden="true">✕</span>
                <span className="group-hover:hidden">{shortAddr}</span>
                <span className="hidden group-hover:inline">Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectWallet}
                disabled={connecting}
                className="rounded-full bg-fg px-3.5 py-1.5 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {connecting ? "Connecting…" : "Connect wallet"}
              </button>
            )
          ) : null}
          <Badge tone="muted">{modeLabel}</Badge>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
