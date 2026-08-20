import { getRequirementSetAction, listRequirementSetsAction } from "@/app/actions/requirementRegistry";
import { getProposalByIdAction } from "@/app/actions/proposals";
import RequirementRegistryWorkspace from "@/components/proposalIntelligence/RequirementRegistryWorkspace";
import { safeRequirementRegistryReturnTo } from "@/lib/proposalIntelligence/requirementRegistryNavigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const maxDuration = 60;
export const metadata: Metadata = { title: "Requirement Registry | RFPilot" };

export default async function RequirementRegistryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ returnTo?: string | string[] }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id)) notFound();
  const proposal = await getProposalByIdAction(id);
  if (!proposal.success) notFound();
  const list = await listRequirementSetsAction(id);
  const sets = list.success ? list.data : [];
  const detail = sets[0] ? await getRequirementSetAction(id, sets[0].id) : null;
  const query = searchParams ? await searchParams : {};
  const returnTo = safeRequirementRegistryReturnTo(id, query.returnTo);
  return <RequirementRegistryWorkspace proposalId={id} initialSets={sets} initialRegistry={detail?.success ? detail.data : null} returnTo={returnTo} />;
}
