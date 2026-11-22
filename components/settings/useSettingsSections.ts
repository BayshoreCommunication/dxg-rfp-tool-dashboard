"use client";

import { useEffect, useState } from "react";
import { getTemplateAccessAction } from "@/app/actions/proposalTemplates";
import { getVendorListAccessAction } from "@/app/actions/vendorList";

export type SettingsSection = { href: string; label: string };

// Settings sections, one entry per page. Shared by the settings modal, the sidebar's
// organization menu and the full-page tab strip so they never drift apart.
const BASE_SECTIONS: SettingsSection[] = [
  { href: "/settings", label: "General" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/teams", label: "Teams" },
  { href: "/settings/security", label: "Security" },
];

// ORG-607: shown to every role that can read the vendor list (not to a Viewer).
const VENDORS_SECTION: SettingsSection = { href: "/settings/vendors", label: "Vendors" };

// ORG-605: shown to every role that can use proposal templates (not to a Viewer).
const TEMPLATES_SECTION: SettingsSection = { href: "/settings/templates", label: "Templates" };

// `vendorsKnown` / `templatesKnown` show a tab straight away on a page that already knows the
// member can use it; otherwise the access is looked up after mounting.
export function useSettingsSections({
  vendorsKnown = false,
  templatesKnown = false,
}: { vendorsKnown?: boolean; templatesKnown?: boolean } = {}): SettingsSection[] {
  const [showVendors, setShowVendors] = useState(vendorsKnown);
  const [showTemplates, setShowTemplates] = useState(templatesKnown);

  useEffect(() => {
    if (vendorsKnown) return;
    let active = true;
    getVendorListAccessAction()
      .then((access) => {
        if (active) setShowVendors(access.canRead);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [vendorsKnown]);

  useEffect(() => {
    if (templatesKnown) return;
    let active = true;
    getTemplateAccessAction()
      .then((access) => {
        if (active) setShowTemplates(access.canUse);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [templatesKnown]);

  return [
    ...BASE_SECTIONS,
    ...(showVendors ? [VENDORS_SECTION] : []),
    ...(showTemplates ? [TEMPLATES_SECTION] : []),
  ];
}
