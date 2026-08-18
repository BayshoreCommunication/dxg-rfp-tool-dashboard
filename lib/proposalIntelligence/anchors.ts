const anchorPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");

export const comparisonCellId = (requirementId: string, participantId: string) =>
  `matrix-cell-${anchorPart(requirementId)}-${anchorPart(participantId)}`;
