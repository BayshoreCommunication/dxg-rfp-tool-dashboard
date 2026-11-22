"use client";

import {
  Building2,
  FileStack,
  Settings2,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useSettingsAccess } from "./SettingsAccessContext";

export type SettingsSectionGroup = "Organization" | "Proposals";

export type SettingsSection = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: SettingsSectionGroup;
};

// Settings sections, one entry per page. Shared by the settings dialog, the sidebar's
// organization menu and the full-page tab strip so they never drift apart.
const BASE_SECTIONS: SettingsSection[] = [
  { href: "/settings", label: "General", icon: Settings2, group: "Organization" },
  { href: "/settings/users", label: "Users", icon: Users, group: "Organization" },
  { href: "/settings/teams", label: "Teams", icon: UsersRound, group: "Organization" },
  { href: "/settings/security", label: "Security", icon: ShieldCheck, group: "Organization" },
];

// ORG-607: shown to every role that can read the vendor list (not to a Viewer).
const VENDORS_SECTION: SettingsSection = {
  href: "/settings/vendors",
  label: "Vendors",
  icon: Building2,
  group: "Proposals",
};

// ORG-605: shown to every role that can use proposal templates (not to a Viewer).
const TEMPLATES_SECTION: SettingsSection = {
  href: "/settings/templates",
  label: "Templates",
  icon: FileStack,
  group: "Proposals",
};

// The access comes from the layout, so the list is complete on first render: no request, and
// Vendors and Templates never pop in after the rest.
export function useSettingsSections(): SettingsSection[] {
  const access = useSettingsAccess();
  const showVendors = access?.vendors.canRead ?? false;
  const showTemplates = access?.templates.canUse ?? false;
  return useMemo(
    () => [
      ...BASE_SECTIONS,
      ...(showVendors ? [VENDORS_SECTION] : []),
      ...(showTemplates ? [TEMPLATES_SECTION] : []),
    ],
    [showVendors, showTemplates],
  );
}
