import { notFound } from "next/navigation";
import { listSupportGrantsAction } from "@/app/actions/supportGrants";
import SupportAccessSettings from "@/components/organization/supportAccess/SupportAccessSettings";
import { supportGrantErrorMessage } from "@/components/organization/supportAccess/supportGrantModel";

// ORG-405. Only an Owner or Admin manages RFPilot Support access. The backend is the judge: it
// answers 403 to every other role, and for them this page does not exist.
export default async function SettingsSupportAccessPage() {
  const result = await listSupportGrantsAction(1);
  if (result.status === 403) notFound();
  return (
    <SupportAccessSettings
      initialPage={result.success ? (result.data ?? null) : null}
      initialError={result.success ? null : supportGrantErrorMessage(result, "Support access couldn't be loaded. Try again.")}
    />
  );
}
