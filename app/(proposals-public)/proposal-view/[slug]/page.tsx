import ProposalPublicView from "@/components/proposals/ProposalPublicView";

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string }>;
  searchParams: Promise<{ source?: string; accessGrant?: string }>;
}) => {
  const { slug } = await params;
  const { source, accessGrant } = await searchParams;

  return (
    <div className="">
      <ProposalPublicView slug={slug} source={source} accessGrant={accessGrant} />
    </div>
  );
};

export default Page;
