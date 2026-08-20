import { Info, Sparkles } from "lucide-react";
import { useEffect, useState, useRef, RefObject } from "react";
import { createPortal } from "react-dom";
import { useAssistantLauncher } from "@/components/ai-assistant/AssistantLauncherContext";
import {
  ASSISTANT_EVENT_FORMATS,
  ASSISTANT_FORM_SECTION_IDS,
  type AssistantEventFormat,
  type AssistantFormSectionId,
} from "@/lib/aiAssistant/uiContext";
import { normalizeAssistantFieldLabel } from "@/lib/aiAssistant/fieldHelp";
import { collectAssistantFieldControlContext } from "@/lib/aiAssistant/fieldControlContext";

export const PillRadio = ({
  name,
  value,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
      checked
        ? "border-[#1DBFD3] bg-white text-[#222628]"
        : "border-[#e4e4e4] bg-white text-[#969798] hover:border-[#1DBFD3]/60"
    }`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="peer sr-only"
    />
    <RadioIndicator checked={checked} />
    {value}
  </label>
);

export const RadioIndicator = ({ checked }: { checked: boolean }) => (
  <span
    aria-hidden="true"
    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-all peer-focus-visible:ring-4 peer-focus-visible:ring-[#1DBFD3]/15 ${
      checked ? "border-[#1DBFD3]" : "border-[#8b989f]"
    }`}
  >
    {checked && <span className="h-2 w-2 rounded-full bg-[#1DBFD3]" />}
  </span>
);

export const PillCheckbox = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
      checked
        ? "border-[#1DBFD3] bg-white text-[#222628]"
        : "border-[#e4e4e4] bg-white text-[#969798] hover:border-[#1DBFD3]/60"
    }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? "border-[#1DBFD3]" : "border-[#e4e4e4]"
      }`}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-[#1DBFD3]" />}
    </span>
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    {label}
  </label>
);

export const toggleItem = (arr: string[], item: string): string[] =>
  arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

export const toggleArrayItem = toggleItem;

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export const InfoTooltip = ({ text }: { text: string }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const lastPointerActivation = useRef<number | null>(null);
  const { enabled: assistantEnabled, requestFieldHelp } =
    useAssistantLauncher();

  const show = () => {
    if (!iconRef.current) return;
    const r = iconRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left + r.width / 2 });
  };

  const toggle = () => {
    if (pos) {
      setPos(null);
      return;
    }
    show();
  };

  const askAssistant = (button: HTMLButtonElement) => {
    const field = button.closest<HTMLElement>(
      "[data-assistant-field-key]",
    );
    const section = button.closest<HTMLElement>(
      '[data-assistant-current-section="true"]',
    );
    const room = button.closest<HTMLElement>(
      "[data-assistant-room-identifier]",
    );
    const label = button.closest("label");
    const labelClone = label?.cloneNode(true) as HTMLElement | undefined;
    labelClone
      ?.querySelectorAll("button, svg")
      .forEach((item) => item.remove());
    const fieldLabel = normalizeAssistantFieldLabel(
      labelClone?.textContent ?? "",
    );
    const fieldKey = field?.dataset.assistantFieldKey;
    const rawSectionId = section?.dataset.assistantSectionId;
    const sectionId = ASSISTANT_FORM_SECTION_IDS.find(
      (item) => item === rawSectionId,
    ) as AssistantFormSectionId | undefined;
    const rawEventFormat = section?.dataset.assistantEventFormat
      ?.trim()
      .toLocaleLowerCase("en-US")
      .replace(/[-\s]+/g, "_");
    const eventFormat = ASSISTANT_EVENT_FORMATS.find(
      (item) => item === rawEventFormat,
    ) as AssistantEventFormat | undefined;
    const roomIdentifier = room?.dataset.assistantRoomIdentifier;
    requestFieldHelp({
      fieldLabel,
      fieldControl: collectAssistantFieldControlContext(
        button,
        fieldLabel,
        text,
      ),
      ...(fieldKey ? { fieldKey } : {}),
      ...(sectionId ? { sectionId } : {}),
      ...(eventFormat ? { eventFormat } : {}),
      ...(roomIdentifier ? { roomIdentifier } : {}),
    });
  };

  return (
    <span className="ml-1.5 inline-flex items-center gap-1 align-middle">
      <button
        type="button"
        ref={iconRef}
        aria-label="About this field"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle();
        }}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBFD3]/40 ${
          pos ? "text-[#1DBFD3]" : "text-[#b0b9d1] hover:text-[#1DBFD3]"
        }`}
      >
        <Info size={13} aria-hidden />
      </button>
      {assistantEnabled && (
        <button
          type="button"
          aria-label="Ask AI about this field"
          onPointerUp={(event) => {
            if (event.pointerType === "mouse") return;
            event.preventDefault();
            event.stopPropagation();
            lastPointerActivation.current = event.timeStamp;
            askAssistant(event.currentTarget);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            // Touch and pen activation runs after the pointer is released.
            // Ignore only the synthetic click that follows it.
            if (
              lastPointerActivation.current !== null &&
              event.timeStamp - lastPointerActivation.current < 700
            ) {
              return;
            }
            askAssistant(event.currentTarget);
          }}
          className="relative z-10 inline-flex h-7 touch-manipulation items-center gap-1.5 rounded-md px-1 text-[13px] font-semibold normal-case tracking-normal text-[#1DBFD3] transition hover:bg-[#eafafd] hover:text-[#109aaf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBFD3]/35 active:scale-[0.98]"
        >
          <Sparkles size={17} strokeWidth={2.25} aria-hidden />
          Ask AI
        </button>
      )}
      {pos && createPortal(
        <div
          role="tooltip"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            width: "220px",
            backgroundColor: "#222628",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 400,
            lineHeight: 1.6,
            letterSpacing: "normal",
            textTransform: "none",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            pointerEvents: "none",
          }}
        >
          {text}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "100%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #222628",
            }}
          />
        </div>,
        document.body
      )}
    </span>
  );
};
