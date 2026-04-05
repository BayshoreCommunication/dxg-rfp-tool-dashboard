import ProposalView from "../../../../components/proposals/ProposalView";

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string }>;
  searchParams: Promise<{ source?: string }>;
}) => {
  const { slug } = await params;
  const { source } = await searchParams;

  return (
    <div className="">
      <ProposalView slug={slug} source={source} />
    </div>
  );
};

export default Page;
