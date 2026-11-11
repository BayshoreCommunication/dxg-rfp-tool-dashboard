import AssistantWorkspacePage from "@/components/proposals/AssistantWorkspacePage";
import ProposalsCreateProcess from "@/components/proposals/ProposalsCreateProcess";
import RfpLimitReached from "@/components/entitlements/RfpLimitReached";
import { loadRfpUsage } from "@/components/entitlements/planGate";
import { redirect } from "next/navigation";
import { getTemplateAccessAction } from "@/app/actions/proposalTemplates";
import StartFromTemplate from "@/components/organization/templates/StartFromTemplate";

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

  // Starting a new RFP at the plan's limit: say so here instead of letting someone fill one in
  // that the backend would refuse to save (ORG-602). An existing RFP (?proposalId=) is not a new one.
  if (!proposalId) {
    const rfpUsage = await loadRfpUsage();
    if (rfpUsage?.atLimit) return <RfpLimitReached usage={rfpUsage} />;
  }

  // ORG-605: members who can use RFP templates (not Viewers) get "Start from a template" here.
  const { canUse: templates } = await getTemplateAccessAction();

  // Flag on: chat-first AI workspace with lazy proposal creation.
  // Flag off: the existing wizard-based create flow, unchanged.
  if (conversationsEnabled) {
    // This route is only the "start something new" entry. Once a proposal
    // exists it has one canonical assistant URL, so older links carrying
    // ?proposalId= are sent there instead of rendering a second copy.
    if (proposalId) redirect(`/proposals/${proposalId}/assistant`);
    return (
      <AssistantWorkspacePage
        initialStarter={initialStarter}
        extraStarter={templates ? <StartFromTemplate /> : undefined}
      />
    );
  }

  return (
    <div>
      {templates && <StartFromTemplate variant="banner" />}
      <ProposalsCreateProcess />
    </div>
  );
};

export default Page;
