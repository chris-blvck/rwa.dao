// Frontend error catalog — faithful to
//   outputs/rwa_intelligence/chris_handoff/frontend_error_catalog.json
// Maps each mock error to a UX state and the required step. No live effect.

export type FrontendErrorInfo = {
  status_code: number;
  ux_state: string;
  required_step: string;
  message: string;
  live_effect: false;
};

export const FRONTEND_ERROR_CATALOG: Record<string, FrontendErrorInfo> = {
  session_sequence_blocked: {
    status_code: 409,
    ux_state: "payment_blocked_until_generation",
    required_step: "generation_payload",
    message: "Payment (with a session_id) is blocked until the generation payload is ready.",
    live_effect: false,
  },
  session_not_found: {
    status_code: 404,
    ux_state: "wallet_not_connected",
    required_step: "wallet_connect",
    message: "The in-memory mock session was reset or does not exist.",
    live_effect: false,
  },
  missing_required_configuration: {
    status_code: 412,
    ux_state: "live_blocked",
    required_step: "human_prerequisites",
    message: "Live prerequisites are missing: provider, wallet, token or rights not confirmed.",
    live_effect: false,
  },
  wallet_signature_blocked: {
    status_code: 403,
    ux_state: "wallet_mock_only",
    required_step: "none_in_mock",
    message: "The local mock never requests a wallet signature.",
    live_effect: false,
  },
  live_provider_call_blocked: {
    status_code: 403,
    ux_state: "provider_mock_only",
    required_step: "human_provider_confirmation",
    message: "Premium provider live calls are blocked.",
    live_effect: false,
  },
  token_transfer_blocked: {
    status_code: 403,
    ux_state: "payment_mock_only",
    required_step: "human_token_confirmation",
    message: "Token transfers are blocked.",
    live_effect: false,
  },
};

/** Human-readable label for a known error key, otherwise a neutral fallback. */
export function describeError(error?: string, fallback?: string): string {
  if (error && FRONTEND_ERROR_CATALOG[error]) return FRONTEND_ERROR_CATALOG[error].message;
  return fallback || "The mock request failed.";
}
