"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { AssistantFieldHelpInput } from "@/lib/aiAssistant/fieldHelp";

type AssistantLauncherValue = {
  enabled: boolean;
  requestFieldHelp: (input: AssistantFieldHelpInput) => void;
};

const AssistantLauncherContext = createContext<AssistantLauncherValue>({
  enabled: false,
  requestFieldHelp: () => undefined,
});

export function AssistantLauncherProvider({
  value,
  children,
}: {
  value: AssistantLauncherValue;
  children: ReactNode;
}) {
  return (
    <AssistantLauncherContext.Provider value={value}>
      {children}
    </AssistantLauncherContext.Provider>
  );
}

export const useAssistantLauncher = (): AssistantLauncherValue =>
  useContext(AssistantLauncherContext);
