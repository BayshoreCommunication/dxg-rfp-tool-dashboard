import SsoCompletePage from "@/components/auth/SsoCompletePage";
import type { Metadata } from "next";

// The backend's SSO callback sends the browser here with a one-time handoff.
// Keep it out of referrers and search engines.
export const metadata: Metadata = {
  title: "Signing you in | RFPilot",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

const page = async ({
  searchParams,
}: {
  searchParams: Promise<{ handoff?: string | string[]; error?: string | string[] }>;
}) => {
  const { handoff, error } = await searchParams;
  return (
    <SsoCompletePage
      handoff={typeof handoff === "string" ? handoff : undefined}
      errorCode={typeof error === "string" ? error : undefined}
    />
  );
};

export default page;
