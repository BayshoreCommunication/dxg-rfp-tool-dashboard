import type { Metadata } from "next";
import { listSupportTicketsAction } from "@/app/actions/supportDesk";
import SupportCenter from "@/components/support/SupportCenter";

export const metadata: Metadata = {
  title: "Support",
  description: "Send RFPilot a message and follow the reply.",
};

const positivePage = (value?: string) => {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string; new?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "all" ? "all" : "active";
  const result = await listSupportTicketsAction({
    status: view === "active" ? "active" : undefined,
    page: positivePage(params.page),
  });
  return (
    <SupportCenter
      // Remount when the request set changes so the composer's open/closed
      // default follows the data instead of surviving client navigations.
      key={`${view}-${result.success ? result.data.tickets.length : "error"}`}
      tickets={result.success ? result.data.tickets : []}
      pagination={result.success ? result.data.pagination : null}
      errorMessage={result.success ? undefined : result.message}
      view={view}
      startOpen={params.new === "1"}
    />
  );
}
