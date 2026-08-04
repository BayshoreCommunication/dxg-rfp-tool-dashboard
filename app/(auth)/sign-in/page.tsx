import SigninPage from "@/components/auth/SigninPage";
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

const page = () => {
  return (
    <div>
      <SigninPage />
    </div>
  );
};

export default page;
