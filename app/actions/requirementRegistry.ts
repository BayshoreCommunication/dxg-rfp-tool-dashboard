"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

export type RegistryValidationItem = { code: string; count?: number; message: string };
export type RegistryValidation = { blocking: RegistryValidationItem[]; warnings: RegistryValidationItem[] };
export type RequirementCriterion = {
  id: string;
  criterion_key: string;
  name: string;
  description: string;
  weight: string | number;
  ordinal: number;
};
export type RegistryRequirement = {
  id: string;
  requirement_key: string;
  kind: "submission" | "mandatory" | "technical" | "commercial" | "staffing" | "references" | "sustainability_dei" | "legal_policy" | "narrative";
  title: string;
  normalized_text: string;
  mandatory_status: "pending" | "mandatory" | "not_mandatory";
  mandatory_reviewed: boolean;
  eligibility: boolean;
  source_kind: "canonical_proposal" | "rendered_rfp";
  source_locator: Record<string, unknown>;
  criterion_id: string | null;
  criterion_key: string | null;
  criterion_name: string | null;
  criterion_reviewed: boolean;
  importance: "high" | "medium" | "low";
  verification_method: "pending" | "document" | "narrative" | "demonstration" | "reference" | "commercial" | "administrative";
  group_key: string;
  ordinal: number;
};
export type RequirementRegistryView = {
  set: {
    id: string;
    version: number;
    status: "draft" | "in_review" | "approved" | "superseded";
    lock_version: number;
    proposal_version: string;
    content_checksum: string;
    validation: RegistryValidation;
    approved_at: string | null;
    superseded_by_id: string | null;
  };
  matrix: null | {
    id: string;
    status: string;
    weightsConfirmed: boolean;
    totalWeight: number;
    criteria: RequirementCriterion[];
  };
  requirements: RegistryRequirement[];
  freshness: { stale: boolean; reasons: string[]; currentProposalVersion: string; currentProposalChecksum: string };
};
export type RequirementSetSummary = RequirementRegistryView["set"] & {
  requirement_count: number;
  freshness: { stale: boolean; reasons: string[] };
};
type Result<T> = { success: true; data: T } | { success: false; code: string; message: string };

const safeMessages: Record<string, string> = {
  REQUIREMENT_REGISTRY_DISABLED: "Proposal intelligence is not enabled in this environment.",
  REQUIREMENT_REGISTRY_WRITES_DISABLED: "Proposal intelligence editing is not enabled in this environment.",
  REQUIREMENT_SET_NOT_FOUND: "This requirement set could not be found.",
  REQUIREMENT_SET_VERSION_CONFLICT: "Someone changed this registry. Refresh it before saving again.",
  REQUIREMENT_SET_STALE: "The proposal changed. Create a superseding version before continuing.",
  REQUIREMENT_SET_IMMUTABLE: "Approved requirement sets cannot be edited.",
  REQUIREMENT_SET_NOT_READY: "Resolve every blocking review item before approval.",
};
const call = async <T>(path: string, init?: RequestInit): Promise<Result<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "X-Correlation-ID": crypto.randomUUID(),
        ...(init?.headers ?? {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true, data: body.data as T }
      : { success: false, code: String(body.code || `HTTP_${response.status}`), message: safeMessages[String(body.code || "")] ?? String(body.title || "Requirement registry operation failed.") };
  } catch {
    return { success: false, code: "NETWORK_ERROR", message: "Proposal intelligence could not be reached." };
  }
};
const base = (proposalId: string) => `/api/v1/proposals/${encodeURIComponent(proposalId)}/intelligence/requirement-sets`;

export const listRequirementSetsAction = async (proposalId: string) =>
  call<RequirementSetSummary[]>(base(proposalId));
export const getRequirementSetAction = async (proposalId: string, setId: string) =>
  call<RequirementRegistryView>(`${base(proposalId)}/${encodeURIComponent(setId)}`);
export const generateRequirementSetAction = async (proposalId: string) =>
  call<RequirementRegistryView>(base(proposalId), {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID(), "Content-Type": "application/json" },
    body: "{}",
  });
export const updateRegistryRequirementAction = async (
  proposalId: string,
  setId: string,
  requirementId: string,
  expectedVersion: number,
  update: {
    title?: string;
    text?: string;
    mandatoryStatus?: RegistryRequirement["mandatory_status"];
    mandatoryReviewed?: boolean;
    eligibility?: boolean;
    criterionId?: string | null;
    criterionReviewed?: boolean;
    importance?: RegistryRequirement["importance"];
    verificationMethod?: RegistryRequirement["verification_method"];
  },
) => call<RequirementRegistryView>(`${base(proposalId)}/${encodeURIComponent(setId)}/requirements/${encodeURIComponent(requirementId)}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), "If-Match": `"${expectedVersion}"` },
  body: JSON.stringify(update),
});
export const approveRequirementSetAction = async (proposalId: string, setId: string, expectedVersion: number) =>
  call<RequirementRegistryView>(`${base(proposalId)}/${encodeURIComponent(setId)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), "If-Match": `"${expectedVersion}"` },
    body: JSON.stringify({ expectedVersion }),
  });
export const supersedeRequirementSetAction = async (proposalId: string, setId: string) =>
  call<RequirementRegistryView>(`${base(proposalId)}/${encodeURIComponent(setId)}/supersede`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: "{}",
  });
