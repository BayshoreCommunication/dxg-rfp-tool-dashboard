import type {
  AssistantEventFormat,
  AssistantFormSectionId,
} from "./uiContext";

export type AssistantFieldHelpInput = {
  fieldLabel: string;
  fieldKey?: string;
  sectionId?: AssistantFormSectionId;
  eventFormat?: AssistantEventFormat;
  roomIdentifier?: string;
};

export type AssistantFieldHelpRequest = {
  id: string;
  prompt: string;
  context: Omit<AssistantFieldHelpInput, "fieldLabel">;
};

export const normalizeAssistantFieldLabel = (value: string): string => {
  const normalized = value
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return normalized || "this proposal field";
};

export const buildAssistantFieldHelpPrompt = (
  fieldLabel: string,
): string =>
  `What should I enter for the "${normalizeAssistantFieldLabel(
    fieldLabel,
  )}" field? Explain it simply and give me one short example.`;
