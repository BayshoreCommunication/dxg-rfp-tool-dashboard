import type { VendorResponseWorkspaceV1 } from "@/contracts/generated/vendor-response-workspace-v1";
import VendorResponseForm from "@/components/vendor/VendorResponseForm";
import VendorResponseWorkspace, { WorkspaceProblem } from "@/components/vendor/workspace/VendorResponseWorkspace";
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

export const dashboardStructuredResponsesEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_VENDOR_STRUCTURED_RESPONSES_ENABLED === "true";

export const usesStructuredWorkspace = (
  workspace: VendorResponseWorkspaceV1,
): workspace is VendorResponseWorkspaceV1 & {
  questionnaire: NonNullable<VendorResponseWorkspaceV1["questionnaire"]>;
} => workspace.capabilities?.structuredResponse === true
  && workspace.capabilities.responseFormat === "structured_v1"
  && workspace.questionnaire !== null;

const legacyForm = (input: {
  slug: string;
  proposalId: string;
  proposalTitle: string;
  email: string;
  trackingId: string;
  accessGrant: string;
}) => (
  <VendorResponseForm
    slug={input.slug}
    proposalId={input.proposalId}
    proposalTitle={input.proposalTitle}
    initialEmail={input.email}
    initialTrackingId={input.trackingId}
    accessGrant={input.accessGrant}
  />
);

type WorkspaceResult =
  | { ok: true; workspace: VendorResponseWorkspaceV1 }
  | { ok: false; message: string };

export const fetchLegacyProposalTitle = async (
  proposalId: string,
  accessGrant: string,
): Promise<string | null> => {
  if (!proposalId || !accessGrant) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/proposals/${proposalId}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "x-rfpilot-access-grant": accessGrant,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const title = json?.data?.event?.eventName;
    return typeof title === "string" && title.trim() ? title.trim() : null;
  } catch {
    return null;
  }
};

export const fetchVendorWorkspace = async (
  proposalId: string,
  accessGrant: string,
): Promise<WorkspaceResult> => {
  if (!proposalId || !accessGrant) {
    return { ok: false, message: "This invitation link is incomplete. Ask the planner for a new vendor response link." };
  }

  try {
    const query = new URLSearchParams({ proposalId });
    const res = await fetch(`${BACKEND_URL}/api/vendor-responses/workspace?${query.toString()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "x-rfpilot-access-grant": accessGrant,
      },
    });
    const json = await res.json();
    if (!res.ok || !json?.success || !json?.data) {
      return { ok: false, message: json?.message || "This vendor response workspace is unavailable." };
    }
    return { ok: true, workspace: json.data as VendorResponseWorkspaceV1 };
  } catch {
    return { ok: false, message: "The vendor response workspace is temporarily unavailable. Check your connection and try again." };
  }
};

export default async function VendorResponsePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { email = "", tid = "", accessGrant = "" } = await searchParams;
  const proposalId = proposalIdFromSlug(slug);
  const fallbackTitle = proposalTitleFromSlug(slug) || "Vendor response";

  if (!dashboardStructuredResponsesEnabled()) {
    const proposalTitle = await fetchLegacyProposalTitle(proposalId, accessGrant);
    return legacyForm({
      slug,
      proposalId,
      proposalTitle: proposalTitle ?? fallbackTitle,
      email,
      trackingId: tid,
      accessGrant,
    });
  }

  const result = await fetchVendorWorkspace(proposalId, accessGrant);

  if (!result.ok) {
    return <WorkspaceProblem title={fallbackTitle} message={result.message} />;
  }

  if (!usesStructuredWorkspace(result.workspace)) {
    return legacyForm({
      slug,
      proposalId,
      proposalTitle: result.workspace.proposalTitle || fallbackTitle,
      email,
      trackingId: tid,
      accessGrant,
    });
  }

  return <VendorResponseWorkspace workspace={result.workspace} accessGrant={accessGrant} initialEmail={email} />;
}
