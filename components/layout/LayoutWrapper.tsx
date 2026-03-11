"use client";

import Sidebar from "@/components/layout/Sidebar";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F4F7FA] ">
      <Sidebar />
      <main className="ml-[90px] min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
