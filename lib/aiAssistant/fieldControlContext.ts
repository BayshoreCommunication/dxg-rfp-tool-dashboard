import type {
  AssistantFieldControlContext,
  AssistantFieldControlType,
  AssistantFieldRequirement,
} from "./uiContext";

const clean = (value: string, maximum: number): string =>
  value.replace(/\s+/g, " ").trim().slice(0, maximum);

const unique = (items: readonly string[]): string[] =>
  [...new Set(items.map((item) => clean(item, 100)).filter(Boolean))].slice(
    0,
    30,
  );

const optionLabelForInput = (input: HTMLInputElement): string => {
  const label = input.closest("label");
  if (label) {
    const clone = label.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("input, button, svg").forEach((item) => item.remove());
    const labelText = clean(clone.textContent ?? "", 100);
    if (labelText) return labelText;
  }
  return clean(input.value, 100);
};

const ignoredButtonText =
  /^(?:ask ai|about this field|suggested|producer call|add|remove|clear|browse)$/i;

const optionLabelForButton = (button: HTMLButtonElement): string => {
  const leafText = [...button.querySelectorAll("span, p, div")]
    .filter((element) => element.childElementCount === 0)
    .map((element) => clean(element.textContent ?? "", 100))
    .find(
      (value) =>
        value &&
        !ignoredButtonText.test(value) &&
        !/^[✓✔+★✕×-]+$/u.test(value),
    );
  return leafText ?? clean(button.textContent ?? "", 100);
};

const selectionLimits = (
  helperText: string,
): Pick<
  AssistantFieldControlContext,
  "minimumSelections" | "maximumSelections"
> => {
  const minimum =
    /(?:select|choose|pick)\s+(?:at least|a minimum of)\s+(\d+)/i.exec(
      helperText,
    )?.[1] ??
    /at least\s+(\d+)\s+(?:selection|option|item)/i.exec(helperText)?.[1];
  const maximum =
    /(?:select|choose|pick)\s+(?:up to|a maximum of|no more than)\s+(\d+)/i.exec(
      helperText,
    )?.[1] ??
    /(?:up to|maximum of|no more than)\s+(\d+)\s+(?:selection|option|item|tag)/i.exec(
      helperText,
    )?.[1];
  return {
    ...(minimum ? { minimumSelections: Number(minimum) } : {}),
    ...(maximum ? { maximumSelections: Number(maximum) } : {}),
  };
};

const requirementFor = (
  label: HTMLLabelElement | null,
  root: HTMLElement,
  helperText: string,
): AssistantFieldRequirement | undefined => {
  const labelText = label?.textContent ?? "";
  if (/\*/.test(labelText) || root.querySelector("[required], [aria-required='true']")) {
    return "required";
  }
  if (/\boptional\b/i.test(labelText)) return "optional";
  if (
    /\bconditional\b/i.test(labelText) ||
    /\brequired\s+(?:when|if)\b/i.test(helperText)
  ) {
    return "conditional";
  }
  return undefined;
};

const controlTypeFor = (
  root: HTMLElement,
): AssistantFieldControlType | undefined => {
  const select = root.querySelector("select");
  if (select) return select.multiple ? "multi_select" : "select";
  if (root.querySelector("textarea")) return "long_text";
  const inputs = [...root.querySelectorAll<HTMLInputElement>("input")];
  if (inputs.some((input) => input.type === "checkbox")) return "multi_select";
  if (inputs.some((input) => input.type === "radio")) return "radio";
  const input = inputs[0];
  if (input) {
    if (input.type === "number") return "number";
    if (input.type === "date" || input.type === "datetime-local") return "date";
    if (input.type === "email") return "email";
    if (input.type === "tel") return "phone";
    if (input.type === "file") return "file";
    return "text";
  }
  const optionButtons = [
    ...root.querySelectorAll<HTMLButtonElement>("button"),
  ].filter(
    (button) =>
      !button.getAttribute("aria-label") &&
      !button.closest("[role='tooltip']"),
  );
  return optionButtons.length > 1 ? "option_buttons" : undefined;
};

const optionsFor = (root: HTMLElement): string[] => {
  const select = root.querySelector("select");
  if (select) {
    return unique(
      [...select.options]
        .filter((option) => !option.disabled && Boolean(option.value.trim()))
        .map((option) => option.textContent ?? option.label),
    );
  }

  const optionInputs = [
    ...root.querySelectorAll<HTMLInputElement>(
      'input[type="radio"], input[type="checkbox"]',
    ),
  ];
  if (optionInputs.length) {
    return unique(optionInputs.map(optionLabelForInput));
  }

  const optionButtons = [
    ...root.querySelectorAll<HTMLButtonElement>("button"),
  ]
    .filter(
      (button) =>
        !button.getAttribute("aria-label") &&
        !button.closest("[role='tooltip']") &&
        !ignoredButtonText.test(clean(button.textContent ?? "", 100)),
    )
    .map(optionLabelForButton);
  return optionButtons.length > 1 ? unique(optionButtons) : [];
};

export const collectAssistantFieldControlContext = (
  source: HTMLButtonElement,
  fieldLabel: string,
  helperText: string,
): AssistantFieldControlContext => {
  const label = source.closest("label");
  const root =
    source.closest<HTMLElement>("[data-assistant-field-key]") ??
    label?.parentElement ??
    label ??
    source.parentElement ??
    source;
  const controlType = controlTypeFor(root);
  const options = optionsFor(root);
  const placeholderControl = root.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >("input[placeholder], textarea[placeholder]");
  const requirement = requirementFor(label, root, helperText);
  const limits = selectionLimits(
    `${helperText} ${clean(root.textContent ?? "", 1_000)}`,
  );
  const maximumSelections =
    limits.maximumSelections ??
    (controlType === "radio" || controlType === "select" ? 1 : undefined);

  return {
    label: clean(fieldLabel, 120),
    helperText: clean(helperText, 600),
    ...(requirement ? { requirement } : {}),
    ...(controlType ? { controlType } : {}),
    ...(options.length ? { options } : {}),
    ...limits,
    ...(maximumSelections !== undefined ? { maximumSelections } : {}),
    ...(placeholderControl?.placeholder
      ? { placeholder: clean(placeholderControl.placeholder, 160) }
      : {}),
  };
};
