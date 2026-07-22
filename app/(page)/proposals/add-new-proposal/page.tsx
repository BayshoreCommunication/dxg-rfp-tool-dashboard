import AssistantWorkspacePage from "@/components/proposals/AssistantWorkspacePage";
import ProposalsCreateProcess from "@/components/proposals/ProposalsCreateProcess";

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
    return <AssistantWorkspacePage initialProposalId={proposalId} />;
  }

  return (
    <div>
      <ProposalsCreateProcess />
    </div>
  );
};

export default Page;
