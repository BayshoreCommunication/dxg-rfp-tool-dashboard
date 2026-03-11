import BrandingSettings from "./BrandingSettings";
import ProposalsSettings from "./ProposalsSettings";
import SignaturesSettings from "./SignaturesSettings";
import TopHeader from "./TopHeaser";

const SettingsDetials = () => {
  return (
    <div className="space-y-8 px-6">
      {/* ── Header ── */}
      <TopHeader />
      <BrandingSettings />
      <ProposalsSettings />
      <SignaturesSettings />
      <div className="mb-8">
        {" "}
        <button className="group relative flex items-center gap-2 overflow-hidden rounded-md bg-gradient-to-br from-[#2dc6f5] to-[#0ea5e9] px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_rgba(45,198,245,0.40)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(45,198,245,0.50)] active:translate-y-0 cursor-pointer">
          {/* shine sweep */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/15 skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-full" />
          Update Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsDetials;
