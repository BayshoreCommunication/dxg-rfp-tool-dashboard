import SettingsModal from "@/components/settings/SettingsModal";

// The settings dialog lives in the layout, not in each section's page, so it stays mounted while
// the member moves between sections: tabs they have opened keep their data and nothing reloads.
// The pages under this folder only claim the URLs; the dialog picks the section from the path.
export default function SettingsModalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsModal />
      {children}
    </>
  );
}
