import { SettingsDialogOpener } from "@/components/settings/SettingsModal";

// The settings dialog itself is a host in app/(page)/layout.tsx that stays mounted, so moving
// between sections and closing and reopening the dialog keep what it has loaded. This layout only
// opens it while an intercepted settings route is showing; the pages under this folder claim the
// URLs, and the dialog picks the section from the path.
export default function SettingsModalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsDialogOpener />
      {children}
    </>
  );
}
