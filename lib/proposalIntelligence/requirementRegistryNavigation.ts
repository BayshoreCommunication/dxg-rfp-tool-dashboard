const proposalIntelligencePath = (proposalId: string) =>
  `/proposals/${proposalId}/intelligence`;

export const requirementRegistryHref = (
  proposalId: string,
  returnTo: string,
) =>
  `${proposalIntelligencePath(proposalId)}/requirements?returnTo=${encodeURIComponent(returnTo)}`;

export const safeRequirementRegistryReturnTo = (
  proposalId: string,
  value: string | string[] | undefined,
) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    typeof candidate === "string" &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
  ) {
    return candidate;
  }
  return proposalIntelligencePath(proposalId);
};
