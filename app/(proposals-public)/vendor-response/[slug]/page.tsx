import VendorResponseForm from "@/components/vendor/VendorResponseForm";
import { BACKEND_URL } from "@/lib/config";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; email?: string; tid?: string; accessGrant?: string }>;
};

export const proposalIdFromSlug = (slug: string): string =>
  /([a-f0-9]{24})$/i.exec(slug)?.[1] ?? "";

const TITLE_ACRONYMS = new Set(["av", "rfp", "audiovisual", "vip"]);

export const proposalTitleFromSlug = (slug: string): string => {
  const proposalId = proposalIdFromSlug(slug);
  const titlePart = proposalId
    ? slug.slice(0, -(proposalId.length + 1))
    : slug;

  return titlePart
    .split("-")
    .filter(Boolean)
    .map((word) =>
      TITLE_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(" ");
};

const fetchProposalInfo = async (
  proposalId: string,
  accessGrant?: string,
): Promise<{ title: string; proposalId: string } | null> => {
  if (!proposalId) return null;

  try {
    const query = accessGrant ? `?accessGrant=${encodeURIComponent(accessGrant)}` : "";
    const res = await fetch(`${BACKEND_URL}/api/proposals/${proposalId}${query}`, {
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
  const { email, tid, accessGrant } = await searchParams;
  const proposalId = proposalIdFromSlug(slug);
  const info = await fetchProposalInfo(proposalId, accessGrant);

  return (
    <VendorResponseForm
      slug={slug}
      proposalId={proposalId}
      proposalTitle={info?.title ?? proposalTitleFromSlug(slug)}
      initialEmail={email ?? ""}
      initialTrackingId={tid ?? ""}
      accessGrant={accessGrant}
    />
  );
}
