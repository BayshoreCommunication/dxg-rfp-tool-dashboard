import proposalFormUi from "@/contracts/proposal/v1/proposal-form-ui.v1.json";

type FieldOption = {
  value: string;
  label: string;
};

type FieldOptionGroup = {
  label: string;
  options: FieldOption[];
};

type EventFormatValue = "In-Person" | "Hybrid" | "Virtual";

const EVENT_FORMAT_VALUES: readonly EventFormatValue[] = [
  "In-Person",
  "Hybrid",
  "Virtual",
];

type FieldUi = {
  label: string;
  requirement: "required" | "optional" | "conditional";
  controlType: string;
  helperText: string;
  example: string;
  minimumSelections?: number;
  maximumSelections?: number;
  options?: FieldOption[];
  optionGroups?: FieldOptionGroup[];
};

const fields = proposalFormUi.fields as Record<string, FieldUi>;

const field = (fieldKey: string): FieldUi => {
  const value = fields[fieldKey];
  if (!value) {
    throw new Error(`Missing proposal form UI metadata for ${fieldKey}`);
  }
  return value;
};

const options = (fieldKey: string): FieldOption[] => {
  const value = field(fieldKey).options;
  if (!value?.length) {
    throw new Error(`Missing proposal form options for ${fieldKey}`);
  }
  return value;
};

export const eventOverviewFieldHelper = (fieldKey: string): string =>
  field(fieldKey).helperText;

export const eventTypeOptions = options("/content/event/type").map(
  (option) => option.value,
);

export const formatOptions = options("/content/event/format").map(
  ({ value, label }): { value: EventFormatValue; label: string } => {
    if (!EVENT_FORMAT_VALUES.includes(value as EventFormatValue)) {
      throw new Error(`Unsupported Event Format value in UI contract: ${value}`);
    }
    return { value: value as EventFormatValue, label };
  },
);

export const audienceOptions = options(
  "/content/event/primaryAudiences/*",
).map((option) => option.value);

export const maximumAudienceSelections =
  field("/content/event/primaryAudiences/*").maximumSelections ?? 4;

export const toneGroups = (
  field("/content/event/toneDirections/*").optionGroups ?? []
).map((group) => ({
  label: group.label,
  options: group.options.map((option) => option.value),
}));

export const maximumToneSelections =
  field("/content/event/toneDirections/*").maximumSelections ?? 5;

export const eventOverviewFieldKeys = Object.freeze(Object.keys(fields));
