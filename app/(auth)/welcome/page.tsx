import { getOrganizationProfileAction } from "@/app/actions/organizationProfile";
import { auth } from "@/auth";
import CompanyNamePage from "@/components/auth/CompanyNamePage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Name your organization | RFPilot",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Right after a first Google or Microsoft sign-up the proxy sends the Owner here.
const page = async () => {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!session.needsCompanyName) redirect("/dashboard");
  const profile = await getOrganizationProfileAction();
  if (profile.success && profile.data && !(profile.data.needsName && profile.data.canEditName)) {
    redirect("/dashboard");
  }
  return <CompanyNamePage firstName={session.user.name?.split(" ")[0] ?? ""} />;
};

export default page;
