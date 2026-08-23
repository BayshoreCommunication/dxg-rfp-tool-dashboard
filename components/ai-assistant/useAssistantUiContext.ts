"use client";

import {
  ASSISTANT_EVENT_FORMATS,
  ASSISTANT_FORM_SECTION_IDS,
  assistantUiContextForPathname,
  sanitizeAssistantUiContextForActiveSections,
  type AssistantEventFormat,
  type AssistantUiContext,
} from "@/lib/aiAssistant/uiContext";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const normalizeEventFormat = (
  value: string | undefined,
): AssistantEventFormat | undefined => {
  const normalized = value
    ?.trim()
    .toLocaleLowerCase("en-US")
    .replace(/[-\s]+/g, "_");
  return ASSISTANT_EVENT_FORMATS.find((item) => item === normalized);
};

const readDocumentContext = (
  base: AssistantUiContext,
): AssistantUiContext => {
  const currentSection = document.querySelector<HTMLElement>(
    '[data-assistant-current-section="true"]',
  );
  const focused = document.activeElement?.closest<HTMLElement>(
    "[data-assistant-field-key]",
  );
  const room = document.activeElement?.closest<HTMLElement>(
    "[data-assistant-room-identifier]",
  );
  const sectionValue = currentSection?.dataset.assistantSectionId;
  const sectionId = ASSISTANT_FORM_SECTION_IDS.find(
    (item) => item === sectionValue,
  );
  const fieldKey = focused?.dataset.assistantFieldKey;
  const roomIdentifier = room?.dataset.assistantRoomIdentifier;
  const eventFormat = normalizeEventFormat(
    currentSection?.dataset.assistantEventFormat,
  );
  return sanitizeAssistantUiContextForActiveSections({
    ...base,
    ...(sectionId ? { sectionId } : {}),
    ...(fieldKey ? { fieldKey } : {}),
    ...(eventFormat ? { eventFormat } : {}),
    ...(roomIdentifier ? { roomIdentifier } : {}),
  });
};

const sameContext = (
  left: AssistantUiContext,
  right: AssistantUiContext,
): boolean => JSON.stringify(left) === JSON.stringify(right);

export default function useAssistantUiContext(): AssistantUiContext {
  const pathname = usePathname();
  const base = useMemo(
    () => assistantUiContextForPathname(pathname),
    [pathname],
  );
  const [context, setContext] = useState<AssistantUiContext>(base);

  useEffect(() => {
    const refresh = () => {
      const next = readDocumentContext(base);
      setContext((current) => (sameContext(current, next) ? current : next));
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-assistant-current-section",
        "data-assistant-section-id",
        "data-assistant-event-format",
      ],
    });
    document.addEventListener("focusin", refresh);
    document.addEventListener("focusout", refresh);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", refresh);
      document.removeEventListener("focusout", refresh);
    };
  }, [base]);

  return context;
}
