/**
 * One way to start a new comparison from anywhere a stale result is shown.
 *
 * The only control that can actually start one lives in the "Compare vendors"
 * panel at the bottom of the Proposal Intelligence home page. Every "out of
 * date" banner used to tell the reader to run a new comparison without
 * offering a way to, so they scrolled the page hunting for it. Now a banner
 * either signals the panel on the same page or sends the reader to it.
 */

/** The heading id of the "Compare vendors" panel; anchors and scrolling target it. */
export const COMPARISON_PANEL_ANCHOR = "comparison-progress-title";

/** Window event the panel listens for; dispatching it starts a run if one can start. */
export const START_COMPARISON_EVENT = "proposal-intelligence:start-comparison";

/** Query flag that makes the panel start a run once when the page opens. */
export const RERUN_QUERY_FLAG = "rerun";

export const intelligenceHomeHref = (proposalId: string) =>
  `/proposals/${encodeURIComponent(proposalId)}/intelligence`;

/** Where a banner off the home page sends the reader: the panel, with a run requested. */
export const rerunHref = (proposalId: string) =>
  `${intelligenceHomeHref(proposalId)}?${RERUN_QUERY_FLAG}=1#${COMPARISON_PANEL_ANCHOR}`;

/** True when the panel is mounted on the current page. */
export const comparisonPanelPresent = () =>
  typeof document !== "undefined" && Boolean(document.getElementById(COMPARISON_PANEL_ANCHOR));

/** Asks the mounted panel to start a run and brings it into view. */
export const requestComparisonOnThisPage = () => {
  if (typeof window === "undefined") return false;
  const panel = document.getElementById(COMPARISON_PANEL_ANCHOR);
  if (!panel) return false;
  window.dispatchEvent(new CustomEvent(START_COMPARISON_EVENT));
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
};
