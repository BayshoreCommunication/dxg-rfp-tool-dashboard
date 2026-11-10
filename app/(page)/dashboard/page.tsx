import RoleDashboard from "@/components/dashboard/RoleDashboard";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  return <RoleDashboard searchParams={await searchParams} />;
};

export default Page;
