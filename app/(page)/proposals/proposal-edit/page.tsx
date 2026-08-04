import AddNewProposal from "@/components/proposals/AddNewProposal";

// Live-AI calls (conversation replies, requirement extraction, draft
// generation) routinely run 10-30s. Vercel's default function timeout is
// well below that and kills the request before the API answers, which the
// UI surfaces as an unresponsive backend. 60s is the Hobby-plan ceiling.
export const maxDuration = 60;

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ proposalId?: string }>;
}) => {
  const { proposalId } = await searchParams;

  return (
    <div>
      <AddNewProposal mode="edit" proposalId={proposalId} />
    </div>
  );
};

export default Page;
