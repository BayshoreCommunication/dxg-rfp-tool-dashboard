import EmailDashboard from "./EmailDashboard";
import TopHeader from "./TopHeader";

const EmailDetials = () => {
  return (
    <div className="space-y-8 ">
      {/* ── Header ── */}
      <TopHeader />

      {/* ── Stat Cards ── */}
      <EmailDashboard />

      {/* ── Recent Proposals ── */}
    </div>
  );
};

export default EmailDetials;
