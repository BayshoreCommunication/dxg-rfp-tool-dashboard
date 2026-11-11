import { canCreateRfps, dashboardRoleOf } from "@/components/dashboard/rfpDashboardModel";
import { loadRfpUsage } from "@/components/entitlements/planGate";
import ProposalsDetials from "@/components/proposals/ProposalsDetials";
import { getMemberIdentity } from "@/lib/server/memberIdentity";

const page = async () => {
  // Viewers are read-only: no create button, so no RFP counter either (ORG-402, ORG-602).
  const identity = await getMemberIdentity();
  const canCreate = canCreateRfps(dashboardRoleOf(identity.roles));
  const rfpUsage = canCreate ? await loadRfpUsage() : null;
  return (
    <div>
      <ProposalsDetials canCreate={canCreate} rfpUsage={rfpUsage} />
    </div>
  );
};

export default page;
