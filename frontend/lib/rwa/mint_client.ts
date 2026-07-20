// Client-side mint flow against Peter's RwaWatchNft (Apothem). Reads live state from our API route,
// then sends mint(quantity, referralId) from the user's wallet with the creator's referral code and
// the right native-XDC value. Ensures the wallet is on XDC Apothem (chain 51 = 0x33).

import { type Address, type Hex } from "viem";
import { RWA_WATCH_NFT_ADDRESS, RWA_WATCH_NFT_CHAIN_ID, RWA_WATCH_NFT_RPC } from "./abi/rwaWatchNft";
import { encodeMint, mintValue } from "./rwa_watch_nft";

export type MintState = {
  contract: string;
  chainId: number;
  explorer: string;
  priceXdcWei: string;
  priceUsdt: string;
  priceIncrementUsdt: string;
  totalSupply: string;
  maxMintPerTx: string;
  mintingEnabled: boolean;
  redemptionThreshold: string;
};

export async function fetchMintState(fetchImpl: typeof fetch = fetch): Promise<MintState | null> {
  try {
    const r = await fetchImpl("/api/rwa/mint/state", { cache: "no-store" });
    const j = (await r.json()) as MintState & { error?: string };
    return j?.priceXdcWei ? j : null;
  } catch {
    return null;
  }
}

export function toHexQuantity(wei: bigint): Hex {
  return `0x${wei.toString(16)}`;
}

export type MintResult =
  | { ok: true; txHash: string }
  | { ok: false; reason: "no_wallet" | "wrong_chain" | "error"; message: string };

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export async function submitMint(params: {
  address: string;
  quantity: number;
  referralId: string;
  priceXdcWei: string;
  ethereum?: Eip1193 | null;
}): Promise<MintResult> {
  const eth = params.ethereum;
  if (!eth?.request) return { ok: false, reason: "no_wallet", message: "Connect a wallet on XDC Apothem to mint." };

  const qty = BigInt(Math.max(1, Math.floor(params.quantity)));
  const value = mintValue(BigInt(params.priceXdcWei), qty);
  const data = encodeMint(qty, params.referralId || "");

  try {
    const chainId = (await eth.request({ method: "eth_chainId" })) as string;
    if (parseInt(chainId, 16) !== RWA_WATCH_NFT_CHAIN_ID) {
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x33" }] });
      } catch (switchErr) {
        // 4902 = the wallet doesn't have Apothem configured (it's not a default network). Add it,
        // which selects it — otherwise "switch to Apothem" is an impossible instruction (dead end).
        if ((switchErr as { code?: number })?.code === 4902) {
          try {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x33",
                chainName: "XDC Apothem Testnet",
                nativeCurrency: { name: "TXDC", symbol: "TXDC", decimals: 18 },
                rpcUrls: [RWA_WATCH_NFT_RPC],
                blockExplorerUrls: ["https://apothem.xdcscan.io"],
              }],
            });
          } catch {
            return { ok: false, reason: "wrong_chain", message: "Add XDC Apothem (chain 51) to your wallet to mint." };
          }
        } else {
          return { ok: false, reason: "wrong_chain", message: "Switch your wallet to XDC Apothem (chain 51)." };
        }
      }
    }
    const txHash = (await eth.request({
      method: "eth_sendTransaction",
      params: [{ from: params.address as Address, to: RWA_WATCH_NFT_ADDRESS, data, value: toHexQuantity(value) }],
    })) as string;
    return { ok: true, txHash };
  } catch (err) {
    return { ok: false, reason: "error", message: String(err instanceof Error ? err.message : err) };
  }
}
