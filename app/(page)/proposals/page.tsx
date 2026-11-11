import ProposalsDetials from "@/components/proposals/ProposalsDetials";
import { loadRfpUsage } from "@/components/entitlements/planGate";

const page = async () => {
  // The plan's RFP counter for the create button (ORG-602).
  const rfpUsage = await loadRfpUsage();
  return (
    <div>
      <ProposalsDetials rfpUsage={rfpUsage} />
    </div>
  );
};

export default page;
