import { getDashboardOverviewAction } from "@/app/actions/overview";
import { getVendorResponsesAction } from "@/app/actions/vendorResponse";
import DashboardTableList from "./DashboardTableList";
import TopCardItem from "./TopCardItem";
import TopHeader from "./TopHeader";

type DashboardOverviewPayload = {
  totals?: {
    totalProposals?: number;
    totalEmailSent?: number;
    totalEmailClicked?: number;
    totalProposalViews?: number;
  };
  latestProposals?: Array<{
    _id: string;
    status?: string;
    isActive?: boolean;
    isFavorite?: boolean;
    viewsCount?: number;
    createdAt?: string;
    event?: { eventName?: string };
    contact?: {
      contactFirstName?: string;
      contactLastName?: string;
      contactEmail?: string;
    };
  }>;
};

const DashboardDetials = async () => {
  const [overviewRes, vendorResponsesRes] = await Promise.all([
    getDashboardOverviewAction(),
    getVendorResponsesAction({ page: 1, limit: 1 }),
  ]);
  const overview =
    overviewRes.success &&
    overviewRes.data &&
    typeof overviewRes.data === "object"
      ? (overviewRes.data as DashboardOverviewPayload)
      : null;

  const totals = {
    totalProposals: overview?.totals?.totalProposals || 0,
    totalEmailSent: overview?.totals?.totalEmailSent || 0,
    totalEmailClicked: overview?.totals?.totalEmailClicked || 0,
    totalProposalViews: overview?.totals?.totalProposalViews || 0,
    totalVendorResponses:
      typeof vendorResponsesRes?.pagination?.total === "number"
        ? vendorResponsesRes.pagination.total
        : 0,
    unreadVendorResponses:
      typeof vendorResponsesRes?.unreadCount === "number"
        ? vendorResponsesRes.unreadCount
        : 0,
  };

  const latestProposals = Array.isArray(overview?.latestProposals)
    ? overview.latestProposals
    : [];

  return (
    <div className="relative mx-auto min-h-full w-full max-w-[1800px]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,138,210,0.07),transparent)]" />

      <div className="space-y-5 pb-6 sm:space-y-7 sm:pb-10 lg:space-y-8 lg:pb-12">
        <TopHeader />
        <TopCardItem totals={totals} />
        <DashboardTableList proposals={latestProposals} totalProposals={totals.totalProposals} />
      </div>
    </div>
  );
};

export default DashboardDetials;
