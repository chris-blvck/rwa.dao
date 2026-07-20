// Tier 1 contract types (mock-only), aligned with the backend's OpenAPI + fixtures:
//   outputs/rwa_palier1_http_mock/openapi.json
//   outputs/rwa_intelligence/chris_handoff/{fixtures_happy_path,contract_examples,frontend_error_catalog}.json
// No value is invented: fields mirror the mock's real responses.

/** Safety flags present on every mock response (always "no live effect"). */
export type MockSafety = {
  no_live_provider_call?: boolean;
  no_wallet_signature?: boolean;
  no_token_transfer?: boolean;
  no_publication?: boolean;
  no_reward_distribution?: boolean;
  auto_reward?: string;
  local_model?: string;
  [k: string]: unknown;
};

/** In-memory session state returned by the backend (volatile, mock-only). */
export type SessionState = {
  session_id: string;
  wallet_state: string;
  selection_state: string;
  generation_state: string;
  payment_state: string;
  next_allowed: string[];
  storage: string;
};

export type WalletInfo = {
  address: string;
  signature_status: string;
  stack: string;
  state: string;
};

/** Default selection returned by the mock (the backend picks the 1st of each list). */
export type SelectionEcho = {
  preset_id: string;
  preset_title: string;
  persona_id: string;
  persona_title: string;
  background_id: string;
  background_title: string;
  asset_id: string;
  asset_title: string;
};

export type GenerationInfo = {
  provider: string;
  endpoint: string;
  status: string;
  live_call: boolean;
  payload_path?: string;
};

export type PaymentInfo = {
  receipt_id: string;
  status: string;
  transfer_hash: string;
  network: string;
  token_contract: string;
  price: string;
  recipient: string;
};

export type HumanPrerequisite = {
  id: string;
  label: string;
  palier: string;
  active: boolean;
  status: "missing" | "blocked" | "pending_human_validation" | "confirmed" | string;
  owner_expected: string;
  source: string;
  impact: string;
  unblock_condition: string;
  safe_to_share: boolean;
};

export type HumanPrerequisitesResponse = {
  mode: string;
  item_count: number;
  items: HumanPrerequisite[];
  safety: Record<string, unknown>;
  blockers: string[];
};

/** Generic envelope: every mock payload carries mode/safety/blockers. */
export type MockEnvelope = {
  mode: string;
  safety?: MockSafety;
  blockers?: string[];
  session?: SessionState;
  [k: string]: unknown;
};

/** Standardized error response (403/404/409/412). */
export type MockError = {
  error: string;
  message: string;
  mode?: string;
  safety?: MockSafety;
  blockers?: string[];
};

/** Uniform client-side result (mirrors palier1_mock_client.d.ts from the handoff). */
export type Palier1Result<T = unknown> = {
  ok: boolean;
  status: number;
  error?: string;
  message?: string;
  payload: T;
};

/** Logical endpoints exposed by the /api/rwa proxy. */
export type RwaEndpoint =
  | "health"
  | "wallet"
  | "preflight"
  | "human-prerequisites"
  | "selection"
  | "generation"
  | "payment"
  | "session-reset";

export type RwaMode = "canned" | "live";
