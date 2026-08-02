"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AssistantPopup from "@/components/ai-assistant/AssistantPopup";
import { AssistantLauncherProvider } from "@/components/ai-assistant/AssistantLauncherContext";
import Sidebar from "@/components/layout/Sidebar";
import { completePendingAssistantHandoff } from "@/lib/aiAssistant/analytics";
import {
  buildAssistantFieldHelpPrompt,
  type AssistantFieldHelpInput,
  type AssistantFieldHelpRequest,
} from "@/lib/aiAssistant/fieldHelp";
import { usePathname } from "next/navigation";

export default function LayoutWrapper({
  children,
  assistantEnabled = false,
}: {
  children: React.ReactNode;
  assistantEnabled?: boolean;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [fieldHelpRequest, setFieldHelpRequest] =
    useState<AssistantFieldHelpRequest | null>(null);
  const fieldHelpSequence = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!assistantEnabled) return;
    void completePendingAssistantHandoff(pathname);
  }, [assistantEnabled, pathname]);

  const requestFieldHelp = useCallback(
    (input: AssistantFieldHelpInput) => {
      if (!assistantEnabled) return;
      fieldHelpSequence.current += 1;
      setFieldHelpRequest({
        id: `field-help-${fieldHelpSequence.current}`,
        prompt: buildAssistantFieldHelpPrompt(input.fieldLabel),
        context: {
          ...(input.fieldKey ? { fieldKey: input.fieldKey } : {}),
          ...(input.sectionId ? { sectionId: input.sectionId } : {}),
          ...(input.eventFormat ? { eventFormat: input.eventFormat } : {}),
          ...(input.roomIdentifier
            ? { roomIdentifier: input.roomIdentifier }
            : {}),
          ...(input.fieldControl
            ? { fieldControl: input.fieldControl }
            : {}),
        },
      });
      setAssistantOpen(true);
    },
    [assistantEnabled],
  );

  const setPopupOpen = useCallback((open: boolean) => {
    setAssistantOpen(open);
    if (!open) setFieldHelpRequest(null);
  }, []);

  const toggleAssistant = useCallback(() => {
    setFieldHelpRequest(null);
    setAssistantOpen((current) => !current);
  }, []);

  const launcherValue = useMemo(
    () => ({
      enabled: assistantEnabled,
      requestFieldHelp,
    }),
    [assistantEnabled, requestFieldHelp],
  );

  return (
    <AssistantLauncherProvider value={launcherValue}>
      <div className="min-h-screen bg-[#F4F7FA]">
        <Sidebar
          assistantOpen={assistantOpen}
          onOpenAssistant={
            assistantEnabled ? toggleAssistant : undefined
          }
        />
        <main className="ml-[90px] min-h-screen">
          <div className="p-6">{children}</div>
        </main>
        {assistantEnabled && (
          <AssistantPopup
            open={assistantOpen}
            onOpenChange={setPopupOpen}
            fieldHelpRequest={fieldHelpRequest}
          />
        )}
      </div>
    </AssistantLauncherProvider>
  );
}
