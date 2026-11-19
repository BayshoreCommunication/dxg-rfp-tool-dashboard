import { notFound } from "next/navigation";
import DesignSystemGallery from "@/components/dev/DesignSystemGallery";

// Development-only reference for the design-system primitives. It must never be reachable in a
// production build: the gate runs on the server before anything is rendered.
export const metadata = { title: "Design system" };

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSystemGallery />;
}
