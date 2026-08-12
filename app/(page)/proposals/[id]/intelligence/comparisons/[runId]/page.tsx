import { redirect } from "next/navigation";

export default async function ComparisonRunPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  redirect(`/proposals/${id}/intelligence/comparisons/${runId}/overview`);
}
