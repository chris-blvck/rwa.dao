export type PartnerDataCategory =
  | "legal"
  | "urls"
  | "media"
  | "claims"
  | "provider"
  | "wallet_payment"
  | "commercial"
  | "compliance"
  | "handoff";

export type PartnerDataStatus =
  | "pending_partner_data"
  | "confirmed"
  | "blocked"
  | "out_of_scope_palier1";

export type PartnerDataIntakeField = {
  id: string;
  category: PartnerDataCategory;
  label: string;
  prompt: string;
  blocksPalier1: boolean;
  secretPolicy: "do_not_store_secret_values";
};

export type PartnerDataDecisionRow = PartnerDataIntakeField & {
  status: PartnerDataStatus;
  evidence: string[];
  notes: string;
};

export type PartnerDataDecisionSummary = {
  total: number;
  confirmed: number;
  pending_partner_data: number;
  blocked: number;
  out_of_scope_palier1: number;
  blocker_count: number;
  stores_secret_values: false;
};

export const PARTNER_DATA_INTAKE_FIELDS: PartnerDataIntakeField[] = [
  {
    id: "partner_legal_identity",
    category: "legal",
    label: "Partner legal identity",
    prompt: "Legal name, public brand relationship, accountable contact and permitted attribution.",
    blocksPalier1: true,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "official_urls",
    category: "urls",
    label: "Official URLs",
    prompt: "Canonical website, verification URL, campaign CTA and any blocked/deprecated links.",
    blocksPalier1: true,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "media_rights",
    category: "media",
    label: "Media rights",
    prompt: "Approved logos, watch renders, creator references, deck assets and usage restrictions.",
    blocksPalier1: true,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "claims_policy",
    category: "claims",
    label: "Claims policy",
    prompt: "Allowed claims, forbidden claims, disclaimers and required review wording.",
    blocksPalier1: true,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "video_provider",
    category: "provider",
    label: "Video provider",
    prompt: "Provider name, model, endpoint shape, media rules, cost model and auth owner.",
    blocksPalier1: true,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "wallet_payment",
    category: "wallet_payment",
    label: "Wallet and token payment",
    prompt: "Wallet stack, chain, token contract, price, treasury recipient and failure/refund policy.",
    blocksPalier1: true,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "commercial_terms",
    category: "commercial",
    label: "Commercial terms",
    prompt: "Generation price logic, campaign limits, user eligibility and support obligations.",
    blocksPalier1: false,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "compliance_review",
    category: "compliance",
    label: "Compliance review",
    prompt: "Human approval state for product wording, token utility, risks and publication boundaries.",
    blocksPalier1: true,
    secretPolicy: "do_not_store_secret_values",
  },
  {
    id: "chris_frontend_validation",
    category: "handoff",
    label: "Chris frontend validation",
    prompt: "Frontend integration owner, accepted API contract, mock flow pass/fail and unresolved UI gaps.",
    blocksPalier1: false,
    secretPolicy: "do_not_store_secret_values",
  },
];

export function buildPartnerDataDecisionMatrix(
  overrides: Partial<Record<string, Partial<Pick<PartnerDataDecisionRow, "status" | "evidence" | "notes">>>> = {},
): PartnerDataDecisionRow[] {
  return PARTNER_DATA_INTAKE_FIELDS.map((field) => ({
    ...field,
    status: overrides[field.id]?.status ?? "pending_partner_data",
    evidence: overrides[field.id]?.evidence ?? [],
    notes: overrides[field.id]?.notes ?? "",
  }));
}

export function summarizePartnerDataDecisionMatrix(rows: PartnerDataDecisionRow[]): PartnerDataDecisionSummary {
  const count = (status: PartnerDataStatus) => rows.filter((row) => row.status === status).length;
  return {
    total: rows.length,
    confirmed: count("confirmed"),
    pending_partner_data: count("pending_partner_data"),
    blocked: count("blocked"),
    out_of_scope_palier1: count("out_of_scope_palier1"),
    blocker_count: rows.filter((row) => row.blocksPalier1 && row.status !== "confirmed").length,
    stores_secret_values: false,
  };
}
