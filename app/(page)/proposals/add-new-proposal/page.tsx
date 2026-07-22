import AssistantWorkspacePage from "@/components/proposals/AssistantWorkspacePage";
import ProposalsCreateProcess from "@/components/proposals/ProposalsCreateProcess";
import { redirect } from "next/navigation";

const conversationsEnabled = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED === "true";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ proposalId?: string }>;
}) => {
  const { proposalId } = await searchParams;

  // Flag on: chat-first AI workspace with lazy proposal creation.
  // Flag off: the existing wizard-based create flow, unchanged.
  if (conversationsEnabled) {
    // This route is only the "start something new" entry. Once a proposal
    // exists it has one canonical assistant URL, so older links carrying
    // ?proposalId= are sent there instead of rendering a second copy.
    if (proposalId) redirect(`/proposals/${proposalId}/assistant`);
    return <AssistantWorkspacePage />;
  }

  return (
    <div>
      <ProposalsCreateProcess />
    </div>
  );
};

export default Page;
