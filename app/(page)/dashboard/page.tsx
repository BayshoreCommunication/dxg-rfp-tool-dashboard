import { Suspense } from "react";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import RoleDashboard from "@/components/dashboard/RoleDashboard";
import TopHeader from "@/components/dashboard/TopHeader";

// The dashboard is filtered, sorted and paged by its query string: this server component reads
// it and RoleDashboard asks the backend for exactly that list. The skeleton is a Suspense
// fallback here and not a route-level loading file on purpose. A loading file is shown again on
// every change of the query string, which would take the search box away from under the person
// typing in it; this boundary shows the skeleton on the first load only and keeps the current
// list on screen while the next one is fetched.
const Loading = () => (
  <div className="relative min-h-screen">
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(47,198,245,0.07),transparent)]" />
    <div className="space-y-8 pb-12">
      {/* The role isn't known yet: no "New Proposal" button, so a Viewer never sees one flash. */}
      <TopHeader canCreate={false} />
      <DashboardSkeleton />
    </div>
  </div>
);

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const params = await searchParams;
  return (
    <Suspense fallback={<Loading />}>
      <RoleDashboard searchParams={params} />
    </Suspense>
  );
};

export default Page;
