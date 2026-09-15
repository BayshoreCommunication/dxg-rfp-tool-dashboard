import HelpCenter from "@/components/help/HelpCenter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help",
  description: "How RFPilot works, from first message to vendor decision.",
};

const Page = () => {
  return <HelpCenter />;
};

export default Page;
