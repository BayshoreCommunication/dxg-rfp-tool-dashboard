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
import Sidebar, { type SidebarUser } from "@/components/layout/Sidebar";
import SupportFab from "@/components/support/SupportFab";
import { completePendingAssistantHandoff } from "@/lib/aiAssistant/analytics";
import {
  buildAssistantFieldHelpPrompt,
  type AssistantFieldHelpInput,
  type AssistantFieldHelpRequest,
} from "@/lib/aiAssistant/fieldHelp";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function LayoutWrapper({
  children,
  assistantEnabled = false,
  currentUser,
}: {
  children: React.ReactNode;
  assistantEnabled?: boolean;
  currentUser?: SidebarUser;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSessionId, setAssistantSessionId] = useState(0);
  const [fieldHelpRequest, setFieldHelpRequest] =
    useState<AssistantFieldHelpRequest | null>(null);
  const fieldHelpSequence = useRef(0);
  const pathname = usePathname();
  // Wide labelled sidebar by default; the member can collapse it to icons. The choice is kept
  // per browser and applied after mount so server and client markup agree on first paint.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(window.localStorage.getItem("rfpilot:sidebar-collapsed") === "1");
    } catch {
      // Storage can be blocked; the default stays.
    }
  }, []);
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("rfpilot:sidebar-collapsed", next ? "1" : "0");
      } catch {
        // Not persisted; still applies for this visit.
      }
      return next;
    });
  }, []);
  const proposalAssistantRoute =
    pathname === "/proposals/add-new-proposal" ||
    /^\/proposals\/[^/]+\/assistant(?:\/|$)/.test(pathname);

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
      setAssistantSessionId((current) => current + 1);
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
    if (assistantOpen) {
      setAssistantOpen(false);
      return;
    }
    setAssistantSessionId((current) => current + 1);
    setAssistantOpen(true);
  }, [assistantOpen]);

  const launcherValue = useMemo(
    () => ({
      enabled: assistantEnabled,
      requestFieldHelp,
    }),
    [assistantEnabled, requestFieldHelp],
  );

  return (
    <AssistantLauncherProvider value={launcherValue}>
      <div
        data-testid="layout-shell"
        className={cn(
          // `hidden` creates a non-scrolling overflow ancestor that prevents
          // route-level sticky rails from following the viewport. `clip`
          // keeps the same horizontal containment without breaking sticky.
          "min-h-svh overflow-x-clip",
          proposalAssistantRoute ? "bg-white lg:bg-[#F4F7FA]" : "bg-[#F4F7FA]",
        )}
      >
        <Sidebar
          currentUser={currentUser}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          assistantOpen={assistantOpen}
          onOpenAssistant={
            assistantEnabled ? toggleAssistant : undefined
          }
        />
        <main
          className={cn(
            "min-h-svh min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))] transition-[margin] duration-200 lg:pb-0 lg:pt-0",
            sidebarCollapsed ? "lg:ml-[88px]" : "lg:ml-[248px]",
          )}
        >
          <div
            className={cn(
              "min-w-0",
              proposalAssistantRoute
                ? "p-0 md:px-5 md:py-4 lg:p-6"
                : "px-3 py-4 sm:px-5 lg:p-6",
            )}
          >
            {children}
          </div>
        </main>
        {assistantEnabled && (
          <AssistantPopup
            open={assistantOpen}
            onOpenChange={setPopupOpen}
            fieldHelpRequest={fieldHelpRequest}
            sessionId={assistantSessionId}
          />
        )}
        <SupportFab />
      </div>
    </AssistantLauncherProvider>
  );
}
