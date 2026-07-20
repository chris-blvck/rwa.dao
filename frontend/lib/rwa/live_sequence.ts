import type { Palier1Result, SessionState } from "./types";

type Json = Record<string, any>;

export type PremiumSessionClient = {
  selection(sessionId?: string): Promise<Palier1Result<Json>>;
  generation(sessionId?: string, opts?: { live_call?: boolean; mode?: string }): Promise<Palier1Result<Json>>;
  payment(sessionId?: string, opts?: { allow_transfer?: boolean; transfer_hash?: string }): Promise<Palier1Result<Json>>;
};

export type PremiumSessionSequenceResult = {
  ok: boolean;
  error?: string;
  message?: string;
  payment?: Json;
  session?: SessionState;
  steps: Array<"selection" | "generation" | "payment">;
};

function readSession(payload: Json): SessionState | undefined {
  return payload.session && typeof payload.session === "object" ? (payload.session as SessionState) : undefined;
}

function failure(
  result: Palier1Result<Json>,
  steps: PremiumSessionSequenceResult["steps"],
  session?: SessionState,
): PremiumSessionSequenceResult {
  return {
    ok: false,
    error: result.error || "mock_sequence_failed",
    message: result.message || "The mock session sequence could not continue.",
    session,
    steps,
  };
}

export async function runPremiumSessionSequence(
  client: PremiumSessionClient,
  sessionId?: string,
): Promise<PremiumSessionSequenceResult> {
  const steps: PremiumSessionSequenceResult["steps"] = [];

  steps.push("selection");
  const selected = await client.selection(sessionId);
  const selectedSession = selected.ok ? readSession(selected.payload) : undefined;
  if (!selected.ok) return failure(selected, steps, selectedSession);

  const generationSessionId = selectedSession?.session_id || sessionId;
  steps.push("generation");
  const generated = await client.generation(generationSessionId);
  const generatedSession = generated.ok ? readSession(generated.payload) : selectedSession;
  if (!generated.ok) return failure(generated, steps, generatedSession);

  const paymentSessionId = generatedSession?.session_id || generationSessionId;
  steps.push("payment");
  const paid = await client.payment(paymentSessionId);
  const paidSession = paid.ok ? readSession(paid.payload) : generatedSession;
  if (!paid.ok) return failure(paid, steps, paidSession);

  return {
    ok: true,
    payment: paid.payload.payment && typeof paid.payload.payment === "object" ? (paid.payload.payment as Json) : undefined,
    session: paidSession,
    steps,
  };
}
