import { lookupInvitationAction } from "@/app/actions/acceptInvitation";
import AcceptInvitePage from "@/components/auth/AcceptInvitePage";
import type { Metadata } from "next";

// ORG-205: invitation emails link to ${FRONTEND_URL}/invite/<token>. Public
// (see proxy.ts); the token is the credential, so keep it out of referrers
// and search engines.
export const metadata: Metadata = {
  title: "Join your team on RFPilot",
  description: "Accept your invitation to RFPilot.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

const page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) => {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);
  const lookup = await lookupInvitationAction(token);
  return (
    <AcceptInvitePage
      // A remount per token keeps form state from leaking between links.
      key={token}
      token={token}
      lookup={lookup}
      initialErrorCode={typeof error === "string" ? error : undefined}
    />
  );
};

export default page;
