"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SettingsAccess } from "./settingsAccess";

const SettingsAccessContext = createContext<SettingsAccess | null>(null);

// Provided by app/(page)/layout.tsx from the session's roles. Null outside that layout (and in
// unit tests that do not wrap), where only the sections every member has are shown.
export function SettingsAccessProvider({ value, children }: { value: SettingsAccess | null; children: ReactNode }) {
  return <SettingsAccessContext.Provider value={value}>{children}</SettingsAccessContext.Provider>;
}

export function useSettingsAccess() {
  return useContext(SettingsAccessContext);
}
