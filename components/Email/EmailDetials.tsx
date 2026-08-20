import EmailDashboard from "./EmailDashboard";
import TopHeader from "./TopHeader";

const EmailDetials = () => {
  return (
    <div className="space-y-5 px-1 pb-4 sm:space-y-8 sm:px-2 sm:pb-6 lg:px-6">
      {/* ── Header ── */}
      <TopHeader />

      {/* ── Stat Cards ── */}
      <EmailDashboard />

      {/* ── Recent Proposals ── */}
    </div>
  );
};

export default EmailDetials;
