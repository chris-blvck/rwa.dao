// "Canned" fixtures — embedded mock responses for offline mode (RWA_MODE=canned).
// Faithful to the handoff artifacts:
//   outputs/rwa_intelligence/chris_handoff/fixtures_happy_path.json
//   outputs/rwa_intelligence/chris_handoff/human_prerequisites_matrix.json
//   outputs/rwa_intelligence/chris_handoff/contract_examples.json
// (labels rendered in English; IDs/statuses/blocker codes kept identical to source.)
//
// Canned mode runs the whole demo WITHOUT the Python backend (ideal for Netlify previews).
// Known limit: serverless is stateless, so strict sequencing (409 payment-before-generation,
// 404 after reset) is enforced in the UI for canned, and server-side in live mode (FastAPI).

import type { HumanPrerequisite } from "./types";

export const MOCK_SESSION_ID = "mock_session_canned01";

export const SAFETY = {
  no_live_provider_call: true,
  no_token_transfer: true,
  no_wallet_signature: true,
  no_publication: true,
  no_reward_distribution: true,
  auto_reward: "disabled_palier3",
  local_model: "excluded_palier2",
};

export const BLOCKERS = [
  "provider.name",
  "provider.endpoint",
  "provider.auth_env",
  "wallet.stack",
  "token.network",
  "token.contract",
  "token.price",
  "payment.recipient",
];

const ROUTES = [
  "/api/mock/health",
  "/api/mock/wallet/connect",
  "/api/mock/preflight",
  "/api/mock/human-prerequisites",
  "/api/mock/selection/options",
  "/api/mock/generation/payload",
  "/api/mock/payment/receipt",
  "/api/mock/session/reset",
];

const SELECTION_ECHO = {
  preset_id: "unboxing_watch_mvp",
  preset_title: "RWA-DAO Watch Unboxing",
  persona_id: "calm_educator",
  persona_title: "Adrian",
  background_id: "dark_luxury_showroom",
  background_title: "Dark Luxury Showroom",
  asset_id: "watch_qr_concept_001",
  asset_title: "RWA-DAO QR Watch Concept",
};

export const HUMAN_PREREQUISITES: HumanPrerequisite[] = [
  {
    id: "partner_identity",
    label: "Partner legal name and RWA-DAO / Real Whales Alliance / Encrypto relationship",
    palier: "Palier 1",
    active: true,
    status: "missing",
    owner_expected: "user_or_partner",
    source: "TO_DO_LIST.md#Prerequis humains",
    impact: "Blocks official attribution and any reliable public communication.",
    unblock_condition: "Confirm the legal name, official URLs and the responsible contact.",
    safe_to_share: true,
  },
  {
    id: "media_rights",
    label: "Rights for images, logos, watch renders, Gamma deck and claims",
    palier: "Palier 1",
    active: true,
    status: "missing",
    owner_expected: "user_or_partner",
    source: "TO_DO_LIST.md#Prerequis humains; outputs/rwa_partner_research/public_media_manifest.csv",
    impact: "Blocks any use of public media in provider prompts, videos or publications.",
    unblock_condition: "Obtain written authorization or provide an approved asset pack.",
    safe_to_share: true,
  },
  {
    id: "verification_url",
    label: "Official RWA-DAO verification URL",
    palier: "Palier 1",
    active: true,
    status: "blocked",
    owner_expected: "user_or_partner",
    source: "TO_DO_LIST.md#Blocages actifs; outputs/rwa_public_research/evidence.csv",
    impact: "Blocks the final CTA and any public proof of verification.",
    unblock_condition: "Provide or fix the official URL (/verify currently returns HTTP 404).",
    safe_to_share: true,
  },
  {
    id: "claims_policy",
    label: "Allowed and forbidden claims",
    palier: "Palier 1",
    active: true,
    status: "missing",
    owner_expected: "user_or_partner",
    source: "TO_DO_LIST.md#Prerequis humains; AGENTS.md#Garde-fous RWA / crypto / luxe",
    impact: "Blocks public copy, final scripts, provider prompts and captions.",
    unblock_condition: "Approve a short list of allowed/forbidden claims before any external use.",
    safe_to_share: true,
  },
  {
    id: "provider_video",
    label: "Premium video provider (Seedance/API type)",
    palier: "Palier 1",
    active: true,
    status: "missing",
    owner_expected: "user_or_partner",
    source: "TO_DO_LIST.md#Incertains; outputs/rwa_intelligence/chris_handoff/live_readiness_config.json",
    impact: "Blocks any live provider generation; only mock payloads are allowed.",
    unblock_condition: "Confirm provider, endpoint, format, cost and auth env name (no secret value).",
    safe_to_share: true,
  },
  {
    id: "wallet_payment_stack",
    label: "Wallet stack, chain, token contract, price and treasury recipient",
    palier: "Palier 1",
    active: true,
    status: "missing",
    owner_expected: "user_or_partner",
    source: "TO_DO_LIST.md#Incertains; outputs/rwa_intelligence/chris_handoff/live_prerequisites_summary.json",
    impact: "Blocks any real or testnet token payment; mock receipt only.",
    unblock_condition: "Confirm wallet stack, network, token contract, price and recipient (no private key).",
    safe_to_share: true,
  },
  {
    id: "chris_integration_validation",
    label: "Frontend integration validation by Chris",
    palier: "Palier 1",
    active: true,
    status: "pending_human_validation",
    owner_expected: "chris",
    source: "TO_DO_LIST.md#Prerequis humains; outputs/rwa_intelligence/chris_handoff/handoff_verify_report.json",
    impact: "Blocks final frontend qualification; the local harness does not replace Chris.",
    unblock_condition: "Run/validate the OpenAPI-first handoff in Chris's final frontend.",
    safe_to_share: true,
  },
];

function session(overrides: Record<string, unknown>) {
  return {
    session_id: MOCK_SESSION_ID,
    wallet_state: "mock_connected",
    selection_state: "not_loaded",
    generation_state: "not_requested",
    payment_state: "not_ready",
    next_allowed: ["selection_options"],
    storage: "in_memory_mock_only",
    ...overrides,
  };
}

export type CannedResult = { status: number; body: Record<string, unknown> };

function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

/** Build the canned response for an endpoint from the request (stateless). */
export function cannedResponse(
  endpoint: string,
  method: string,
  body: Record<string, unknown>,
): CannedResult {
  switch (endpoint) {
    case "health":
      return {
        status: 200,
        body: { service: "rwa_palier1_http_mock_canned", routes: ROUTES, mode: "mock_only", safety: SAFETY, blockers: BLOCKERS },
      };

    case "wallet": {
      const address = (body.address as string) || "0x0000000000000000000000000000000000000000";
      return {
        status: 200,
        body: {
          wallet: { address, signature_status: "not_requested_mock_only", stack: "TO_CONFIRM", state: "mock_connected" },
          session: session({}),
          mode: "mock_only",
          safety: SAFETY,
          blockers: BLOCKERS,
        },
      };
    }

    case "preflight": {
      const wantsLive = truthy(body.allow_provider_live) || truthy(body.allow_payment_live);
      if (wantsLive) {
        return {
          status: 412,
          body: {
            error: "missing_required_configuration",
            message: "Live provider, wallet, token or rights prerequisites are missing.",
            mode: "mock_only",
            safety: SAFETY,
            blockers: BLOCKERS,
          },
        };
      }
      return {
        status: 200,
        body: { preflight: { status: "mock_only", activation_allowed: false }, mode: "mock_only", safety: SAFETY, blockers: BLOCKERS },
      };
    }

    case "human-prerequisites":
      return {
        status: 200,
        body: {
          mode: "mock_only",
          item_count: HUMAN_PREREQUISITES.length,
          items: HUMAN_PREREQUISITES,
          safety: { stores_secret_values: false, external_calls: false, wallet_signature: false, token_transfer: false },
          blockers: [],
        },
      };

    case "selection":
      return {
        status: 200,
        body: {
          selection: SELECTION_ECHO,
          session: session({ selection_state: "options_loaded", next_allowed: ["generation_payload"] }),
          mode: "mock_only",
          safety: SAFETY,
          blockers: BLOCKERS,
        },
      };

    case "generation": {
      if (truthy(body.live_call) || (body.mode && body.mode !== "mock_only")) {
        return {
          status: 403,
          body: {
            error: "live_provider_call_blocked",
            message: "Premium provider live calls are blocked.",
            mode: "mock_only",
            safety: SAFETY,
            blockers: BLOCKERS,
          },
        };
      }
      return {
        status: 200,
        body: {
          generation: {
            provider: "seedance_or_equivalent",
            endpoint: "TO_CONFIRM",
            status: "mock_provider_payload_ready",
            live_call: false,
            payload_path: "premium_provider_payload.json",
          },
          provider_payload: {
            mode: "mock_only",
            model_family: "seedance_or_equivalent",
            task_type: "premium_video_generation_mock",
            auth_env: "SEEDANCE_API_KEY",
            endpoint: "TO_CONFIRM",
            live_call: false,
            request: {
              language: "fr",
              aspect_ratio: "9:16",
              duration_seconds: 15,
              cta: "TO_DEFINE",
              disclaimer: "For information only. Not financial advice. Human validation required before distribution.",
              negative_claims: ["buyback", "guaranteed", "redemption", "profit"],
            },
            rights_gate: {
              asset_rights_status: "to_confirm_before_publication",
              background_rights_status: "to_confirm_before_publication",
              public_use: "blocked_until_human_rights_validation",
            },
          },
          session: session({ selection_state: "options_loaded", generation_state: "payload_ready", next_allowed: ["payment_receipt"] }),
          mode: "mock_only",
          safety: SAFETY,
          blockers: BLOCKERS,
        },
      };
    }

    case "payment": {
      if (truthy(body.allow_transfer) || (typeof body.transfer_hash === "string" && body.transfer_hash.length > 0)) {
        return {
          status: 403,
          body: {
            error: "token_transfer_blocked",
            message: "Token transfers are blocked.",
            mode: "mock_only",
            safety: SAFETY,
            blockers: BLOCKERS,
          },
        };
      }
      return {
        status: 200,
        body: {
          payment: {
            receipt_id: "mock_receipt_canned01",
            status: "mock_receipt_no_transfer",
            transfer_hash: "",
            network: "TO_CONFIRM",
            token_contract: "TO_CONFIRM",
            price: "TO_CONFIRM",
            recipient: "TO_CONFIRM",
          },
          session: session({
            selection_state: "options_loaded",
            generation_state: "payload_ready",
            payment_state: "receipt_ready",
            next_allowed: ["session_reset"],
          }),
          mode: "mock_only",
          safety: SAFETY,
          blockers: BLOCKERS,
        },
      };
    }

    case "session-reset":
      return {
        status: 200,
        body: {
          session: {
            session_id: "",
            wallet_state: "wallet_not_connected",
            selection_state: "not_loaded",
            generation_state: "not_requested",
            payment_state: "not_ready",
            next_allowed: ["wallet_connect"],
            storage: "in_memory_mock_only",
          },
          mode: "mock_only",
          safety: SAFETY,
          blockers: BLOCKERS,
        },
      };

    default:
      return { status: 404, body: { error: "unknown_endpoint", message: `Unknown canned endpoint: ${endpoint}`, mode: "mock_only" } };
  }
}
