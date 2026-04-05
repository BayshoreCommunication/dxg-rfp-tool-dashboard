import AddNewProposal from "@/components/proposals/AddNewProposal";

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
