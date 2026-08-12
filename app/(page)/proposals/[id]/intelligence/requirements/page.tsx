import { getRequirementSetAction, listRequirementSetsAction } from "@/app/actions/requirementRegistry";
import { getProposalByIdAction } from "@/app/actions/proposals";
import RequirementRegistryWorkspace from "@/components/proposalIntelligence/RequirementRegistryWorkspace";
import { notFound } from "next/navigation";

export const maxDuration = 60;

export default async function RequirementRegistryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id)) notFound();
  const proposal = await getProposalByIdAction(id);
  if (!proposal.success) notFound();
  const list = await listRequirementSetsAction(id);
  const sets = list.success ? list.data : [];
  const detail = sets[0] ? await getRequirementSetAction(id, sets[0].id) : null;
  return <RequirementRegistryWorkspace proposalId={id} initialSets={sets} initialRegistry={detail?.success ? detail.data : null} />;
}
