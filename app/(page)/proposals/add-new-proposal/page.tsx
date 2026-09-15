import AssistantWorkspacePage from "@/components/proposals/AssistantWorkspacePage";
import ProposalsCreateProcess from "@/components/proposals/ProposalsCreateProcess";
import { redirect } from "next/navigation";

// Live-AI calls (conversation replies, requirement extraction, draft
// generation) routinely run 10-30s. Vercel's default function timeout is
// well below that and kills the request before the API answers, which the
// UI surfaces as an unresponsive backend. 60s is the Hobby-plan ceiling.
export const maxDuration = 60;

const conversationsEnabled = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED === "true";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ proposalId?: string; start?: string }>;
}) => {
  const { proposalId, start } = await searchParams;
  // A first-run dashboard or empty proposals list can arrive with the
  // starter already chosen; anything else is ignored.
  const initialStarter =
    start === "example" || start === "scratch" ? start : undefined;

  // Flag on: chat-first AI workspace with lazy proposal creation.
  // Flag off: the existing wizard-based create flow, unchanged.
  if (conversationsEnabled) {
    // This route is only the "start something new" entry. Once a proposal
    // exists it has one canonical assistant URL, so older links carrying
    // ?proposalId= are sent there instead of rendering a second copy.
    if (proposalId) redirect(`/proposals/${proposalId}/assistant`);
    return <AssistantWorkspacePage initialStarter={initialStarter} />;
  }

  return (
    <div>
      <ProposalsCreateProcess />
    </div>
  );
};

export default Page;
