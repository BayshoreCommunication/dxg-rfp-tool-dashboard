import { getDashboardOverviewAction } from "@/app/actions/overview";
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
  const overviewRes = await getDashboardOverviewAction();
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
  };

  const latestProposals = Array.isArray(overview?.latestProposals)
    ? overview.latestProposals
    : [];

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,198,245,0.07),transparent)]" />

      <div className="space-y-8 pb-12">
        <TopHeader />
        <TopCardItem totals={totals} />
        <DashboardTableList proposals={latestProposals} />
      </div>
    </div>
  );
};

export default DashboardDetials;
