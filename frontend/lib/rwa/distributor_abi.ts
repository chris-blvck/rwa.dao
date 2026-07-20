// Minimal ABI for RwaxRewardDistributor (claim + reads) — used to encode the on-chain claim call.
export const DISTRIBUTOR_ABI = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "c",
        type: "tuple",
        components: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "reason", type: "bytes32" },
          { name: "nonce", type: "bytes32" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "totalClaimed",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  { type: "function", name: "token", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
] as const;
