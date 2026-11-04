import { getOrganizationProfileAction } from "@/app/actions/organizationProfile";
import { auth } from "@/auth";
import LeaveOnboarding from "@/components/auth/LeaveOnboarding";
import OnboardingWizard from "@/components/auth/OnboardingWizard";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Set up your organization | RFPilot",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// The proxy sends an Owner or Admin here until their new organization finishes onboarding.
const page = async () => {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!session.needsOnboarding) redirect("/dashboard");
  const profile = await getOrganizationProfileAction();
  // Never strand anyone here: done elsewhere, not theirs to finish, or a backend
  // that can't answer all mean the dashboard (after clearing the session flag).
  if (!profile.success || !profile.data || !profile.data.canManage || profile.data.onboardingStep === "done") {
    return <LeaveOnboarding />;
  }
  return <OnboardingWizard firstName={session.user.name?.split(" ")[0] ?? ""} profile={profile.data} />;
};

export default page;
