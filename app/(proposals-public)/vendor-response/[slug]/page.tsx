import type { VendorResponseWorkspaceV1 } from "@/contracts/generated/vendor-response-workspace-v1";
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

type WorkspaceResult =
  | { ok: true; workspace: VendorResponseWorkspaceV1 }
  | { ok: false; message: string };

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
  const { email, accessGrant = "" } = await searchParams;
  const proposalId = proposalIdFromSlug(slug);
  const result = await fetchVendorWorkspace(proposalId, accessGrant);

  if (!result.ok) {
    return <WorkspaceProblem title={proposalTitleFromSlug(slug) || "Vendor response"} message={result.message} />;
  }

  return <VendorResponseWorkspace workspace={result.workspace} accessGrant={accessGrant} initialEmail={email ?? ""} />;
}
