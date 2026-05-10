import VendorResponseForm from "@/components/vendor/VendorResponseForm";
import { BACKEND_URL } from "@/lib/config";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; email?: string; tid?: string }>;
};

const fetchProposalInfo = async (
  slug: string,
): Promise<{ title: string; proposalId: string } | null> => {
  const match = /([a-f0-9]{24})$/i.exec(slug);
  if (!match) return null;
  const proposalId = match[1];

  try {
    const res = await fetch(`${BACKEND_URL}/api/proposals/${proposalId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const title = json?.data?.event?.eventName?.trim() || "Untitled Proposal";
    return { title, proposalId };
  } catch {
    return null;
  }
};

export default async function VendorResponsePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { email, tid } = await searchParams;
  const info = await fetchProposalInfo(slug);

  return (
    <VendorResponseForm
      slug={slug}
      proposalId={info?.proposalId ?? ""}
      proposalTitle={info?.title ?? ""}
      initialEmail={email ?? ""}
      initialTrackingId={tid ?? ""}
    />
  );
}
