"use client";

import { useState } from "react";
import AssistantPopup from "@/components/ai-assistant/AssistantPopup";
import Sidebar from "@/components/layout/Sidebar";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const assistantEnabled =
    process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED === "true";
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Sidebar
        assistantOpen={assistantOpen}
        onOpenAssistant={
          assistantEnabled
            ? () => setAssistantOpen((current) => !current)
            : undefined
        }
      />
      <main className="ml-[90px] min-h-screen">
        <div className="p-6">{children}</div>
      </main>
      {assistantEnabled && (
        <AssistantPopup
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
        />
      )}
    </div>
  );
}
