// Peter's deployed fractional-watch NFT (RwaWatchNft, symbol RWAXDC) — the source of truth for the
// on-chain mint. ERC-721 Enumerable, XDC Apothem (chain 51). We integrate against it: read the live
// price/supply, mint with a creator's referralId, and watch Minted events for reward attribution.
// Full ABI lives in Peter's repo; this minimal fragment covers our calls (typed `as const` for viem).

export const RWA_WATCH_NFT_ADDRESS = "0xb76F7df88695447b180f9CD1c7c32A9532752a11" as const;
export const RWA_WATCH_NFT_CHAIN_ID = 51; // XDC Apothem
export const RWA_WATCH_NFT_RPC = "https://rpc.ankr.com/xdc_testnet";
export const RWA_WATCH_NFT_EXPLORER = "https://apothem.xdcscan.io/address/0xb76F7df88695447b180f9CD1c7c32A9532752a11";

export const RWA_WATCH_NFT_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "referralId", type: "string" },
    ],
    outputs: [],
  },
  { type: "function", name: "getMintPriceInXDC", stateMutability: "view", inputs: [], outputs: [{ name: "xdcAmount", type: "uint256" }] },
  { type: "function", name: "priceInUsdt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "priceIncrementUsdt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "maxMintPerTx", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "mintingEnabled", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "redemptionThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "event",
    name: "Minted",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "quantity", type: "uint256", indexed: false },
      { name: "totalPaid", type: "uint256", indexed: false },
      { name: "totalUsdt", type: "uint256", indexed: false },
      { name: "referralId", type: "string", indexed: false },
    ],
  },
] as const;
