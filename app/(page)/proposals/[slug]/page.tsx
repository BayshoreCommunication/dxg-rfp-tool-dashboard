import ProposalView from "../../../../components/proposals/ProposalView";

const Page = async ({ params }: { params: Promise<{ slug?: string }> }) => {
  const { slug } = await params;

  return (
    <div className="">
      <ProposalView slug={slug} />
    </div>
  );
};

export default Page;
