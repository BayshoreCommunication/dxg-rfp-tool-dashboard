"use client";

import { createContext, useContext } from "react";

// True while a settings page is rendered inside the settings modal. The modal has its own
// left-hand section list, so the page's own title and tab strip step aside.
const SettingsModalContext = createContext(false);

export const SettingsModalProvider = SettingsModalContext.Provider;

export function useInSettingsModal() {
  return useContext(SettingsModalContext);
}
