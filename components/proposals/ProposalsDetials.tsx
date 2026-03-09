import ProposalFilters from "./ProposalFilters";
import ProposalsTableList from "./ProposalsTableList";
import TopHeader from "./TopHeader";

const ProposalsDetials = () => {
  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <TopHeader />

      {/* ── Stat Cards ── */}
      <ProposalFilters />

      {/* ── Recent Proposals ── */}
      <ProposalsTableList />
    </div>
  );
};

export default ProposalsDetials;
