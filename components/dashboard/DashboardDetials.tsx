import DashboardTableList from "./DashboardTableList";
import TopCardItem from "./TopCardItem";
import TopHeader from "./TopHeader";

const DashboardDetials = () => {
  return (
    <div className="relative min-h-screen">
      {/* Subtle page-level ambient gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,198,245,0.07),transparent)]" />

      <div className="space-y-8 pb-12">
        {/* ── Header ── */}
        <TopHeader />

        {/* ── Stat Cards ── */}
        <TopCardItem />

        {/* ── Proposals Section ── */}
        <DashboardTableList />
      </div>
    </div>
  );
};

export default DashboardDetials;
