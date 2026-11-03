import SigninPage from "@/components/auth/SigninPage";
import { pendingView, readPendingTwoFactor } from "@/lib/server/twoFactorPending";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title:
    "RFPilot - Streamline Your Request for Proposal Process",
  description:
    "Discover RFPilot, a powerful platform designed to simplify and enhance your request for proposal process.",
  alternates: {
    canonical: "/sign-in",
    languages: {
      "en-US": "/en-USA",
    },
  },
  openGraph: {
    title:
      "RFPilot - Streamline Your Request for Proposal Process",
    description:
      "Discover RFPilot, a powerful platform designed to simplify and enhance your request for proposal process.",
    url: "/sign-in",
    images: [{ url: "/opengraph-image.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "RFPilot - Streamline Your Request for Proposal Process",
    description:
      "Discover RFPilot, a powerful platform designed to simplify and enhance your request for proposal process.",
    images: ["/opengraph-image.jpg"],
  },
};

const page = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; step?: string }>;
}) => {
  // Auth.js redirects here with ?error=AccessDenied (etc.) when an OAuth
  // sign-in fails — surface it in the form's error banner.
  const { error, step } = await searchParams;
  // A Google sign-in that needs a second factor comes back with
  // ?step=two-factor; the challenge itself is in an httpOnly cookie.
  const pending = step === "two-factor" ? await readPendingTwoFactor() : null;
  return (
    <div>
      <SigninPage
        authError={
          error ?? (step === "two-factor" && !pending ? "TwoFactorExpired" : undefined)
        }
        pendingTwoFactor={pending ? pendingView(pending) : null}
      />
    </div>
  );
};

export default page;
