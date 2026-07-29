import AssistantWorkspacePage from "@/components/proposals/AssistantWorkspacePage";
import { getProposalByIdAction } from "@/app/actions/proposals";
import { isSafeProposalId } from "@/lib/aiAssistant/handoff";
import { notFound } from "next/navigation";

const conversationsEnabled = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED === "true";

// Canonical URL for an existing proposal's assistant. `/proposals/add-new-proposal`
// stays the "start something new" entry and redirects here as soon as a proposal
// exists, so there is exactly one surface for the conversation.
const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  if (!conversationsEnabled || !isSafeProposalId(id)) notFound();

  // Revalidate ownership and availability at the destination. The selector is
  // only a convenience; it never becomes an authorization boundary.
  const proposal = await getProposalByIdAction(id);
  if (!proposal.success) notFound();

  return <AssistantWorkspacePage initialProposalId={id} />;
};

export default Page;
