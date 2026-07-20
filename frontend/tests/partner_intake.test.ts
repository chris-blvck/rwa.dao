import { describe, expect, it } from "vitest";
import {
  PARTNER_DATA_INTAKE_FIELDS,
  buildPartnerDataDecisionMatrix,
  summarizePartnerDataDecisionMatrix,
} from "@/lib/rwa/partner_intake";

describe("partner data intake matrix", () => {
  it("tracks the external partner inputs needed before live/product decisions", () => {
    const ids = PARTNER_DATA_INTAKE_FIELDS.map((field) => field.id);

    expect(ids).toEqual([
      "partner_legal_identity",
      "official_urls",
      "media_rights",
      "claims_policy",
      "video_provider",
      "wallet_payment",
      "commercial_terms",
      "compliance_review",
      "chris_frontend_validation",
    ]);
    expect(PARTNER_DATA_INTAKE_FIELDS.every((field) => field.secretPolicy === "do_not_store_secret_values")).toBe(true);
  });

  it("starts every field as pending partner data and summarizes the blocker count", () => {
    const matrix = buildPartnerDataDecisionMatrix();

    expect(matrix.every((row) => row.status === "pending_partner_data")).toBe(true);
    expect(matrix.filter((row) => row.blocksPalier1).length).toBeGreaterThanOrEqual(6);
    expect(summarizePartnerDataDecisionMatrix(matrix)).toEqual({
      total: matrix.length,
      confirmed: 0,
      pending_partner_data: matrix.length,
      blocked: 0,
      out_of_scope_palier1: 0,
      blocker_count: matrix.filter((row) => row.blocksPalier1).length,
      stores_secret_values: false,
    });
  });
});
