import { describe, expect, it } from "vitest";
import { runPremiumSessionSequence } from "@/lib/rwa/live_sequence";
import type { Palier1Result, SessionState } from "@/lib/rwa/types";

type Json = Record<string, any>;

const session = (patch: Partial<SessionState> = {}): SessionState => ({
  session_id: "mock_session_live01",
  wallet_state: "mock_connected",
  selection_state: "not_loaded",
  generation_state: "not_requested",
  payment_state: "not_ready",
  next_allowed: ["selection_options"],
  storage: "in_memory_mock_only",
  ...patch,
});

const ok = (payload: Json): Palier1Result<Json> => ({ ok: true, status: 200, payload });
const failed = (error: string): Palier1Result<Json> => ({
  ok: false,
  status: 409,
  error,
  message: error,
  payload: { error },
});

describe("premium live session sequence", () => {
  it("loads selection and generation payload before payment", async () => {
    const calls: string[] = [];
    const client = {
      selection: async (sessionId?: string) => {
        calls.push(`selection:${sessionId}`);
        return ok({ session: session({ selection_state: "options_loaded", next_allowed: ["generation_payload"] }) });
      },
      generation: async (sessionId?: string) => {
        calls.push(`generation:${sessionId}`);
        return ok({
          provider_payload: { live_call: false },
          session: session({ selection_state: "options_loaded", generation_state: "payload_ready", next_allowed: ["payment_receipt"] }),
        });
      },
      payment: async (sessionId?: string) => {
        calls.push(`payment:${sessionId}`);
        return ok({
          payment: { receipt_id: "mock_receipt_live01", transfer_hash: "" },
          session: session({
            selection_state: "options_loaded",
            generation_state: "payload_ready",
            payment_state: "receipt_ready",
            next_allowed: ["display_receipt"],
          }),
        });
      },
    };

    const result = await runPremiumSessionSequence(client, "mock_session_live01");

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["selection:mock_session_live01", "generation:mock_session_live01", "payment:mock_session_live01"]);
    expect(result.payment?.receipt_id).toBe("mock_receipt_live01");
    expect(result.session?.payment_state).toBe("receipt_ready");
  });

  it("does not call payment when the generation payload is blocked", async () => {
    const calls: string[] = [];
    const client = {
      selection: async (sessionId?: string) => {
        calls.push(`selection:${sessionId}`);
        return ok({ session: session({ selection_state: "options_loaded", next_allowed: ["generation_payload"] }) });
      },
      generation: async (sessionId?: string) => {
        calls.push(`generation:${sessionId}`);
        return failed("session_sequence_blocked");
      },
      payment: async (sessionId?: string) => {
        calls.push(`payment:${sessionId}`);
        return ok({ payment: { receipt_id: "should_not_happen" } });
      },
    };

    const result = await runPremiumSessionSequence(client, "mock_session_live01");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("session_sequence_blocked");
    expect(calls).toEqual(["selection:mock_session_live01", "generation:mock_session_live01"]);
  });
});
