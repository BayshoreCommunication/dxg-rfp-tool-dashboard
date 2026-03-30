import EmailSend from "./EmailSend";
import TopHeader from "./TopHeader";

const EmailSendBody = () => {
  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <TopHeader />

      {/* ── Stat Cards ── */}
      <EmailSend />

      {/* ── Recent Proposals ── */}
    </div>
  );
};

export default EmailSendBody;
