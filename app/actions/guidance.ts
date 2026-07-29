"use server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };
const safeMessages: Record<string, string> = {
  GUIDANCE_DISABLED:
    "Proposal guidance is not enabled for this environment yet.",
  GUIDANCE_NOT_FOUND: "No readiness check has been run for this proposal yet.",
  PROPOSAL_NOT_FOUND: "This proposal could not be found.",
};
export type GuidanceSeverity = "info" | "warning" | "blocking";
export type GuidanceCategory =
  | "completeness"
  | "schedule"
  | "production"
  | "budget"
  | "risk";
export type GuidanceScopeCategory =
  | "missing_dependency"
  | "quantity_mismatch"
  | "possible_duplication"
  | "needs_confirmation";
export type GuidanceScopeSeverity =
  | "blocking"
  | "high_confidence_gap"
  | "review_recommended"
  | "optional_optimization"
  | "needs_venue_confirmation"
  | "insufficient_information";
export type GuidanceRoomCategory =
  | "room_gap"
  | "schedule_conflict"
  | "crew_conflict"
  | "reuse_opportunity"
  | "duplicate_rental"
  | "missing_input";
export type GuidanceFinding = {
  id?: string;
  code: string;
  severity: GuidanceSeverity;
  category: GuidanceCategory;
  message: string;
  paths: string[];
  affectedSection?: string | null;
  affectedFields?: string[];
  evidence?: Array<{
    path: string;
    state: "missing" | "present" | "conflicting";
    value?: string;
  }>;
  explanation?: string;
  suggestedNextStep?: string;
  confidence?: "high" | "medium" | "low";
  provenance?: {
    source: "current_proposal";
    ruleId: string;
    ruleVersion: string;
  };
  proposalVersion?: number;
  analysisVersion?: string;
  scopeCategory?: GuidanceScopeCategory;
  scopeSeverity?: GuidanceScopeSeverity;
  roomCategory?: GuidanceRoomCategory;
  roomKeys?: string[];
  question?: string;
};
export type GuidanceSectionCompleteness = {
  section: string;
  label: string;
  filled: number;
  total: number;
  score: number;
};
export type GuidanceReport = {
  id: string;
  proposalVersion: number;
  currentProposalVersion?: number;
  stale?: boolean;
  analysisVersion?: string;
  engineVersion: string;
  summary?: {
    eventName: string | null;
    eventFormat: string | null;
    dateRange: string | null;
    attendeeCount: number | null;
    roomCount: number | null;
  };
  roomSchedule?: {
    version: string;
    roomCount: number;
    confidence: "high" | "medium" | "low";
    rooms: Array<{
      roomKey: string;
      roomLabel: string;
      showStartAt: string | null;
      showEndAt: string | null;
      findingCount: number;
      confidence: "high" | "medium" | "low";
    }>;
    roomLevelGapIds: string[];
    scheduleConflictIds: string[];
    crewConflictIds: string[];
    reusableEquipmentOpportunityIds: string[];
    duplicateRentalIds: string[];
    missingInputIds: string[];
    roomSubtotals: Array<{
      roomKey: string;
      roomLabel: string;
      status: "pricing_not_evaluated";
      amountMinor: null;
      currency: null;
      reason: string;
    }>;
    sharedServicesSubtotal: {
      status: "pricing_not_evaluated";
      amountMinor: null;
      currency: null;
      reason: string;
    };
  };
  overallCompleteness: number;
  completeness: GuidanceSectionCompleteness[];
  findings: GuidanceFinding[];
  findingCount: number;
  blockingCount: number;
  createdAt: string;
};
const severities: GuidanceSeverity[] = ["info", "warning", "blocking"];
const categories: GuidanceCategory[] = [
  "completeness",
  "schedule",
  "production",
  "budget",
  "risk",
];
const asScore = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
};
const asCount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};
const normalize = (raw: GuidanceReport): GuidanceReport => {
  const completeness = (Array.isArray(raw.completeness) ? raw.completeness : [])
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      section: String(s.section ?? ""),
      label: String(s.label || s.section || "Section"),
      filled: asCount(s.filled),
      total: asCount(s.total),
      score: asScore(s.score),
    }));
  const findings = (Array.isArray(raw.findings) ? raw.findings : [])
    .filter((f) => f && typeof f === "object" && typeof f.message === "string")
    .map((f) => {
      const paths = Array.isArray(f.paths)
        ? f.paths.filter((p): p is string => typeof p === "string")
        : [];
      const code = String(f.code ?? "");
      const analysisVersion = String(
        f.analysisVersion ?? raw.analysisVersion ?? raw.engineVersion ?? "",
      );
      return {
        id: String(f.id || `${analysisVersion}:${code}:${paths.join("|")}`),
        code,
        severity: severities.includes(f.severity) ? f.severity : "info",
        category: categories.includes(f.category) ? f.category : "risk",
        message: f.message,
        paths,
        affectedSection:
          typeof f.affectedSection === "string" ? f.affectedSection : null,
        affectedFields: Array.isArray(f.affectedFields)
          ? f.affectedFields.filter(
              (field): field is string => typeof field === "string",
            )
          : [],
        evidence: (Array.isArray(f.evidence) ? f.evidence : []).flatMap(
          (item) => {
            if (!item || typeof item !== "object" || typeof item.path !== "string")
              return [];
            const state = ["missing", "present", "conflicting"].includes(
              String(item.state),
            )
              ? (item.state as "missing" | "present" | "conflicting")
              : "missing";
            return [{
              path: item.path,
              state,
              ...(typeof item.value === "string" ? { value: item.value } : {}),
            }];
          },
        ),
        explanation:
          typeof f.explanation === "string" ? f.explanation : f.message,
        suggestedNextStep:
          typeof f.suggestedNextStep === "string"
            ? f.suggestedNextStep
            : "Review the affected proposal fields.",
        confidence: ["high", "medium", "low"].includes(String(f.confidence))
          ? (f.confidence as "high" | "medium" | "low")
          : ("high" as const),
        provenance: {
          source: "current_proposal" as const,
          ruleId:
            typeof f.provenance?.ruleId === "string"
              ? f.provenance.ruleId
              : code,
          ruleVersion:
            typeof f.provenance?.ruleVersion === "string"
              ? f.provenance.ruleVersion
              : analysisVersion,
        },
        proposalVersion: asCount(
          f.proposalVersion ?? raw.proposalVersion,
        ),
        analysisVersion,
        scopeCategory: [
          "missing_dependency",
          "quantity_mismatch",
          "possible_duplication",
          "needs_confirmation",
        ].includes(String(f.scopeCategory))
          ? (f.scopeCategory as GuidanceScopeCategory)
          : undefined,
        scopeSeverity: [
          "blocking",
          "high_confidence_gap",
          "review_recommended",
          "optional_optimization",
          "needs_venue_confirmation",
          "insufficient_information",
        ].includes(String(f.scopeSeverity))
          ? (f.scopeSeverity as GuidanceScopeSeverity)
          : undefined,
        roomCategory: [
          "room_gap",
          "schedule_conflict",
          "crew_conflict",
          "reuse_opportunity",
          "duplicate_rental",
          "missing_input",
        ].includes(String(f.roomCategory))
          ? (f.roomCategory as GuidanceRoomCategory)
          : undefined,
        roomKeys: Array.isArray(f.roomKeys)
          ? f.roomKeys
              .filter((key): key is string => typeof key === "string")
              .slice(0, 2)
          : undefined,
        question: typeof f.question === "string" ? f.question : undefined,
      };
    });
  const summary: Record<string, unknown> =
    raw.summary && typeof raw.summary === "object"
      ? (raw.summary as unknown as Record<string, unknown>)
      : {};
  const proposalVersion = asCount(raw.proposalVersion);
  const rawRoomSchedule: Record<string, unknown> =
    raw.roomSchedule && typeof raw.roomSchedule === "object"
      ? (raw.roomSchedule as unknown as Record<string, unknown>)
      : {};
  const stringIds = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  const confidence = (value: unknown): "high" | "medium" | "low" =>
    ["high", "medium", "low"].includes(String(value))
      ? (value as "high" | "medium" | "low")
      : "low";
  const normalizedRooms = (
    Array.isArray(rawRoomSchedule.rooms) ? rawRoomSchedule.rooms : []
  ).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const room = item as Record<string, unknown>;
    return [{
      roomKey: String(room.roomKey ?? ""),
      roomLabel: String(room.roomLabel || "Room"),
      showStartAt:
        typeof room.showStartAt === "string" ? room.showStartAt : null,
      showEndAt:
        typeof room.showEndAt === "string" ? room.showEndAt : null,
      findingCount: asCount(room.findingCount),
      confidence: confidence(room.confidence),
    }];
  });
  const roomSchedule =
    typeof rawRoomSchedule.version === "string"
      ? {
          version: rawRoomSchedule.version,
          roomCount: asCount(rawRoomSchedule.roomCount),
          confidence: confidence(rawRoomSchedule.confidence),
          rooms: normalizedRooms,
          roomLevelGapIds: stringIds(rawRoomSchedule.roomLevelGapIds),
          scheduleConflictIds: stringIds(rawRoomSchedule.scheduleConflictIds),
          crewConflictIds: stringIds(rawRoomSchedule.crewConflictIds),
          reusableEquipmentOpportunityIds: stringIds(
            rawRoomSchedule.reusableEquipmentOpportunityIds,
          ),
          duplicateRentalIds: stringIds(rawRoomSchedule.duplicateRentalIds),
          missingInputIds: stringIds(rawRoomSchedule.missingInputIds),
          roomSubtotals: [],
          sharedServicesSubtotal: {
            status: "pricing_not_evaluated" as const,
            amountMinor: null,
            currency: null,
            reason:
              "Authoritative pricing is calculated separately from room analysis.",
          },
        }
      : undefined;
  return {
    id: String(raw.id ?? ""),
    proposalVersion,
    currentProposalVersion:
      asCount(raw.currentProposalVersion) || proposalVersion,
    stale: raw.stale === true,
    analysisVersion: String(raw.analysisVersion ?? raw.engineVersion ?? ""),
    engineVersion: String(raw.engineVersion ?? ""),
    summary: {
      eventName:
        typeof summary.eventName === "string" ? summary.eventName : null,
      eventFormat:
        typeof summary.eventFormat === "string" ? summary.eventFormat : null,
      dateRange:
        typeof summary.dateRange === "string" ? summary.dateRange : null,
      attendeeCount:
        Number.isFinite(Number(summary.attendeeCount))
          ? Number(summary.attendeeCount)
          : null,
      roomCount:
        Number.isFinite(Number(summary.roomCount))
          ? Number(summary.roomCount)
          : null,
    },
    roomSchedule,
    overallCompleteness: asScore(raw.overallCompleteness),
    completeness,
    findings,
    findingCount: asCount(raw.findingCount) || findings.length,
    blockingCount: findings.filter((f) => f.severity === "blocking").length,
    createdAt: String(raw.createdAt ?? ""),
  };
};
const call = async (
  proposalId: string,
  init?: RequestInit,
): Promise<Result<GuidanceReport>> => {
  const suffix = init?.method === "POST" ? "" : "/latest";
  try {
    const r = await authenticatedBackendFetch(
        `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(proposalId)}/guidance-reports${suffix}`,
        {
          ...init,
          cache: "no-store",
          headers: {
            "X-Correlation-ID": crypto.randomUUID(),
            ...(init?.headers ?? {}),
          },
        },
      ),
      b = await r.json().catch(() => ({}));
    return r.ok
      ? { success: true, data: normalize(b.data as GuidanceReport) }
      : {
          success: false,
          code: String(b.code || `HTTP_${r.status}`),
          message:
            safeMessages[String(b.code || "")] ??
            String(b.title || "The readiness check could not be completed."),
        };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: "The guidance service could not be reached.",
    };
  }
};
export const generateGuidanceAction = async (proposalId: string) =>
  await call(proposalId, { method: "POST" });
export const getLatestGuidanceAction = async (proposalId: string) =>
  await call(proposalId);
