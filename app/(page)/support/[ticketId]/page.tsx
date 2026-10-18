import type { Metadata } from "next";
import Link from "next/link";
import { getSupportTicketAction } from "@/app/actions/supportDesk";
import SupportTicketThread from "@/components/support/SupportTicketThread";

export const metadata: Metadata = { title: "Support request" };

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const result = await getSupportTicketAction(ticketId);
  if (!result.success) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-10 text-center sm:px-6">
        <p role="alert" className="text-sm font-semibold text-rose-700">
          {result.message}
        </p>
        <Link href="/support" className="mt-4 inline-block text-sm font-semibold text-[#0069a0] hover:underline">
          Back to Support
        </Link>
      </div>
    );
  }
  return (
    <SupportTicketThread
      ticket={result.data.ticket}
      messages={result.data.messages}
      assignee={result.data.assignee}
    />
  );
}
