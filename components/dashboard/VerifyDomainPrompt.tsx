import { auth } from "@/auth";
import { listDomainsAction } from "@/app/actions/domains";
import { getOrganizationProfileAction } from "@/app/actions/organizationProfile";
import VerifyDomainBanner from "./VerifyDomainBanner";
import { verifyDomainPromptFor } from "./verifyDomainRules";

/* Shown to Owners and Admins whose organization has no verified domain yet. */
export default async function VerifyDomainPrompt() {
  const profile = await getOrganizationProfileAction();
  if (!profile.success || !profile.data?.canManage) return null;
  const [session, domains] = await Promise.all([auth(), listDomainsAction()]);
  // Couldn't read the domains: say nothing rather than nag wrongly.
  if (!domains.success) return null;
  const prompt = verifyDomainPromptFor({
    canManage: true,
    email: session?.user?.email,
    domains: domains.data ?? [],
  });
  return prompt ? <VerifyDomainBanner prompt={prompt} /> : null;
}
