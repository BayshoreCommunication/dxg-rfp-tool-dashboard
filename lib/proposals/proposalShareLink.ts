export const buildProposalViewShareUrl = (
  origin: string,
  proposalSlug: string,
  accessGrant: string,
): string => {
  const url = new URL(
    `/proposal-view/${encodeURIComponent(proposalSlug)}`,
    origin,
  );
  url.searchParams.set("source", "share");
  url.searchParams.set("accessGrant", accessGrant);
  return url.toString();
};

export const copyTextToClipboard = async (value: string): Promise<void> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Fall through for browsers that expose Clipboard API but deny its use.
  }

  const input = document.createElement("input");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(input);

  if (!copied) throw new Error("Clipboard write failed");
};
