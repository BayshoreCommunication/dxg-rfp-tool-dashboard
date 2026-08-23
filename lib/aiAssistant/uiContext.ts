import {
  isStandaloneVideoRecordingPath,
  STANDALONE_VIDEO_RECORDING_STEP_ENABLED,
} from "@/lib/proposals/proposalExperience";

export const ASSISTANT_ROUTE_CATEGORIES = [
  "dashboard",
  "proposals",
  "proposal_creation",
  "proposal_detail",
  "proposal_assistant",
  "email",
  "vendor_responses",
  "settings",
  "other",
] as const;
export const ASSISTANT_WORKFLOWS = [
  "proposal_intake",
  "proposal_review",
  "proposal_assistant",
  "proposal_email",
  "vendor_response_review",
] as const;
export const ASSISTANT_FORM_SECTION_IDS = [
  "event_overview",
  "venue_schedule",
  "room_specifications",
  "hybrid_virtual",
  "content_creative",
  "video_recording",
  "venue_technical",
  "investment_evaluation",
  "uploads_covendors",
  "contact_submit",
] as const;
export const ASSISTANT_EVENT_FORMATS = [
  "in_person",
  "hybrid",
  "virtual",
] as const;

export type AssistantRouteCategory =
  (typeof ASSISTANT_ROUTE_CATEGORIES)[number];
export type AssistantWorkflow = (typeof ASSISTANT_WORKFLOWS)[number];
export type AssistantFormSectionId =
  (typeof ASSISTANT_FORM_SECTION_IDS)[number];
export type AssistantEventFormat = (typeof ASSISTANT_EVENT_FORMATS)[number];

export const ASSISTANT_FIELD_CONTROL_TYPES = [
  "text",
  "long_text",
  "number",
  "date",
  "email",
  "phone",
  "select",
  "radio",
  "multi_select",
  "option_buttons",
  "file",
] as const;
export const ASSISTANT_FIELD_REQUIREMENTS = [
  "required",
  "optional",
  "conditional",
] as const;

export type AssistantFieldControlType =
  (typeof ASSISTANT_FIELD_CONTROL_TYPES)[number];
export type AssistantFieldRequirement =
  (typeof ASSISTANT_FIELD_REQUIREMENTS)[number];

export type AssistantFieldControlContext = {
  label: string;
  helperText: string;
  requirement?: AssistantFieldRequirement;
  controlType?: AssistantFieldControlType;
  options?: string[];
  minimumSelections?: number;
  maximumSelections?: number;
  placeholder?: string;
};

export type AssistantUiContext = {
  schemaVersion: "assistant-ui-context.v1";
  routeCategory: AssistantRouteCategory;
  workflow?: AssistantWorkflow;
  sectionId?: AssistantFormSectionId;
  fieldKey?: string;
  eventFormat?: AssistantEventFormat;
  roomIdentifier?: string;
  fieldControl?: AssistantFieldControlContext;
};

/**
 * Retired sections stay in the protocol allowlist for compatibility, but stale
 * clients and DOM nodes cannot make those sections active again.
 */
export const sanitizeAssistantUiContextForActiveSections = (
  context: AssistantUiContext,
): AssistantUiContext => {
  const hasRetiredField = Boolean(
    context.fieldKey && isStandaloneVideoRecordingPath(context.fieldKey),
  );
  if (
    STANDALONE_VIDEO_RECORDING_STEP_ENABLED ||
    (context.sectionId !== "video_recording" && !hasRetiredField)
  ) {
    return context;
  }

  const sanitized = { ...context };
  delete sanitized.sectionId;
  delete sanitized.fieldKey;
  delete sanitized.fieldControl;
  delete sanitized.roomIdentifier;
  return sanitized;
};

const includes = <T extends string>(
  values: readonly T[],
  value: unknown,
): value is T => typeof value === "string" && values.includes(value as T);

const normalizedFieldControl = (
  value: unknown,
): AssistantFieldControlContext | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    typeof input.label !== "string" ||
    !input.label.trim() ||
    input.label.length > 120 ||
    typeof input.helperText !== "string" ||
    !input.helperText.trim() ||
    input.helperText.length > 600
  ) {
    return null;
  }
  if (
    input.requirement !== undefined &&
    !includes(ASSISTANT_FIELD_REQUIREMENTS, input.requirement)
  ) {
    return null;
  }
  if (
    input.controlType !== undefined &&
    !includes(ASSISTANT_FIELD_CONTROL_TYPES, input.controlType)
  ) {
    return null;
  }
  if (
    input.placeholder !== undefined &&
    (typeof input.placeholder !== "string" || input.placeholder.length > 160)
  ) {
    return null;
  }
  if (
    input.options !== undefined &&
    (!Array.isArray(input.options) ||
      input.options.length > 30 ||
      input.options.some(
        (option) =>
          typeof option !== "string" ||
          !option.trim() ||
          option.length > 100,
      ))
  ) {
    return null;
  }
  const validSelectionLimit = (candidate: unknown): candidate is number =>
    Number.isInteger(candidate) && Number(candidate) >= 0 && Number(candidate) <= 30;
  if (
    input.minimumSelections !== undefined &&
    !validSelectionLimit(input.minimumSelections)
  ) {
    return null;
  }
  if (
    input.maximumSelections !== undefined &&
    (!validSelectionLimit(input.maximumSelections) ||
      Number(input.maximumSelections) < 1)
  ) {
    return null;
  }
  if (
    input.minimumSelections !== undefined &&
    input.maximumSelections !== undefined &&
    Number(input.minimumSelections) > Number(input.maximumSelections)
  ) {
    return null;
  }

  return {
    label: input.label.trim(),
    helperText: input.helperText.trim(),
    ...(input.requirement
      ? { requirement: input.requirement as AssistantFieldRequirement }
      : {}),
    ...(input.controlType
      ? { controlType: input.controlType as AssistantFieldControlType }
      : {}),
    ...(input.options
      ? { options: (input.options as string[]).map((option) => option.trim()) }
      : {}),
    ...(input.minimumSelections !== undefined
      ? { minimumSelections: Number(input.minimumSelections) }
      : {}),
    ...(input.maximumSelections !== undefined
      ? { maximumSelections: Number(input.maximumSelections) }
      : {}),
    ...(input.placeholder
      ? { placeholder: input.placeholder.trim() }
      : {}),
  };
};

export const assistantUiContextForPathname = (
  pathname: string | null | undefined,
): AssistantUiContext => {
  const path = pathname?.split("?", 1)[0]?.split("#", 1)[0] || "/";
  if (path === "/dashboard") {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "dashboard",
    };
  }
  if (path === "/proposals/add-new-proposal") {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "proposal_creation",
      workflow: "proposal_intake",
    };
  }
  if (/^\/proposals\/[^/]+\/assistant$/.test(path)) {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "proposal_assistant",
      workflow: "proposal_assistant",
    };
  }
  if (path === "/proposals") {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "proposals",
      workflow: "proposal_review",
    };
  }
  if (/^\/(?:proposal|proposals)\/[^/]+/.test(path)) {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "proposal_detail",
      workflow: "proposal_review",
    };
  }
  if (path === "/email" || path.startsWith("/email/")) {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "email",
      workflow: "proposal_email",
    };
  }
  if (path === "/vendor-responses" || path.startsWith("/vendor-responses/")) {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "vendor_responses",
      workflow: "vendor_response_review",
    };
  }
  if (path === "/settings" || path.startsWith("/settings/")) {
    return {
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "settings",
    };
  }
  return {
    schemaVersion: "assistant-ui-context.v1",
    routeCategory: "other",
  };
};

export const normalizeAssistantUiContext = (
  value: unknown,
): AssistantUiContext | null => {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (
    input.schemaVersion !== "assistant-ui-context.v1" ||
    !includes(ASSISTANT_ROUTE_CATEGORIES, input.routeCategory)
  ) {
    return null;
  }
  if (
    input.workflow !== undefined &&
    !includes(ASSISTANT_WORKFLOWS, input.workflow)
  ) {
    return null;
  }
  if (
    input.sectionId !== undefined &&
    !includes(ASSISTANT_FORM_SECTION_IDS, input.sectionId)
  ) {
    return null;
  }
  if (
    input.eventFormat !== undefined &&
    !includes(ASSISTANT_EVENT_FORMATS, input.eventFormat)
  ) {
    return null;
  }
  if (
    input.fieldKey !== undefined &&
    (typeof input.fieldKey !== "string" ||
      input.fieldKey.length > 300 ||
      !/^\/content\/[A-Za-z0-9/*_-]+$/.test(input.fieldKey))
  ) {
    return null;
  }
  if (
    input.roomIdentifier !== undefined &&
    (typeof input.roomIdentifier !== "string" ||
      input.roomIdentifier.length > 64 ||
      !/^[A-Za-z0-9:_-]+$/.test(input.roomIdentifier))
  ) {
    return null;
  }
  const fieldControl =
    input.fieldControl === undefined
      ? undefined
      : normalizedFieldControl(input.fieldControl);
  if (input.fieldControl !== undefined && !fieldControl) return null;
  return sanitizeAssistantUiContextForActiveSections({
    schemaVersion: "assistant-ui-context.v1",
    routeCategory: input.routeCategory,
    ...(input.workflow ? { workflow: input.workflow as AssistantWorkflow } : {}),
    ...(input.sectionId
      ? { sectionId: input.sectionId as AssistantFormSectionId }
      : {}),
    ...(input.fieldKey ? { fieldKey: input.fieldKey as string } : {}),
    ...(input.eventFormat
      ? { eventFormat: input.eventFormat as AssistantEventFormat }
      : {}),
    ...(input.roomIdentifier
      ? { roomIdentifier: input.roomIdentifier as string }
      : {}),
    ...(fieldControl ? { fieldControl } : {}),
  });
};

export type AssistantStarterPrompt = {
  prompt: string;
  label: string;
};

const startersByRoute: Record<
  AssistantRouteCategory,
  readonly AssistantStarterPrompt[]
> = {
  dashboard: [
    { prompt: "What can I do from the Dashboard?", label: "Dashboard help" },
    { prompt: "Help me start a proposal.", label: "Start a proposal" },
  ],
  proposals: [
    { prompt: "Help me start a proposal.", label: "Start a proposal" },
    {
      prompt: "What should I review before sending a proposal?",
      label: "Pre-send review",
    },
    {
      prompt: "Explain the proposal workflow.",
      label: "Proposal workflow",
    },
  ],
  proposal_creation: [
    {
      prompt: "What belongs in this section?",
      label: "Explain this section",
    },
    { prompt: "Show me a good example.", label: "Show an example" },
    { prompt: "What information am I missing?", label: "What to collect" },
  ],
  proposal_detail: [
    {
      prompt: "What should I review before sending?",
      label: "Review checklist",
    },
    {
      prompt: "How do I open the proposal assistant?",
      label: "Proposal assistant",
    },
  ],
  proposal_assistant: [
    { prompt: "Summarize this proposal.", label: "Summarize" },
    { prompt: "What information is missing?", label: "Find gaps" },
  ],
  email: [
    {
      prompt: "Help me prepare a proposal email.",
      label: "Prepare an email",
    },
    { prompt: "Explain campaign tracking.", label: "Campaign tracking" },
  ],
  vendor_responses: [
    {
      prompt: "Explain vendor response status.",
      label: "Response status",
    },
    {
      prompt: "What should I compare across vendors?",
      label: "Compare vendors",
    },
  ],
  settings: [
    { prompt: "What can I manage in Settings?", label: "Settings help" },
    { prompt: "How do I update branding?", label: "Branding help" },
  ],
  other: [
    {
      prompt: "How do I create and send a proposal?",
      label: "Create a proposal",
    },
    {
      prompt: "What information should I gather for an event?",
      label: "Plan an event",
    },
  ],
};

export const assistantStarterPromptsForContext = (
  context: AssistantUiContext,
): readonly AssistantStarterPrompt[] => {
  if (context.fieldKey) {
    return [
      {
        prompt: "What should I enter in this field?",
        label: "Explain this field",
      },
      { prompt: "Show me a good example.", label: "Show an example" },
      { prompt: "Can I leave this blank?", label: "Is it required?" },
    ];
  }
  return startersByRoute[context.routeCategory];
};
