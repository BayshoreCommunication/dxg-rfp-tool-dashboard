import SigninPage from "@/components/auth/SigninPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Dxg RFP Tool - Streamline Your Request for Proposal Process with Our User-Friendly Platform",
  description:
    "Discover the Dxg RFP Tool, a powerful platform designed to simplify and enhance your request for proposal process. Our user-friendly interface allows you to create, manage, and track RFPs with ease, ensuring you find the best solutions for your business needs. Streamline your procurement process and make informed decisions with our comprehensive RFP management features.",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en-USA",
    },
  },
  openGraph: {
    images: [{ url: "/opengraph-image.jpg" }],
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
