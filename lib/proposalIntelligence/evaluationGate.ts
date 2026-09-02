/**
 * What the scoring section may say before an evaluation exists.
 *
 * The backend refuses to create an evaluation until the response's proposal
 * intelligence run has succeeded with no source warnings (and the scoring
 * matrix is approved, which only the server can check). The detail page
 * already loads that intelligence run for the section above, so the scoring
 * section derives its own readiness from it instead of offering a button the
 * server is certain to reject.
 */
import type { VendorIntelligenceResult } from "@/app/actions/vendorIntelligence";

export type EvaluationGate =
  | { state: "unknown" }
  | { state: "analysis_missing" }
  | { state: "analysis_running" }
  | { state: "analysis_failed" }
  | { state: "coverage_blocked"; details: string[] }
  | { state: "ready" };

const warningText = (warnings: Array<Record<string, unknown>>) =>
  warnings
    .map((warning) => {
      const message = typeof warning.message === "string" ? warning.message : "";
      const source = typeof warning.sourceLabel === "string" ? warning.sourceLabel : "";
      return source && message ? `${source}: ${message}` : message || source;
    })
    .filter(Boolean);

export const evaluationGateFromIntelligence = (input: {
  loaded: boolean;
  result?: VendorIntelligenceResult;
}): EvaluationGate => {
  if (!input.loaded) return { state: "unknown" };
  const run = input.result?.run;
  if (!run) return { state: "analysis_missing" };
  if (run.status === "queued" || run.status === "running") return { state: "analysis_running" };
  if (run.status === "failed") return { state: "analysis_failed" };
  if (run.warnings.length > 0) {
    return { state: "coverage_blocked", details: warningText(run.warnings) };
  }
  return { state: "ready" };
};

/** One plain sentence for each state, written for the person who must act. */
export const evaluationGateMessage = (gate: EvaluationGate): string => {
  switch (gate.state) {
    case "unknown":
      return "No evaluation has been started for this version.";
    case "analysis_missing":
      return "Scoring uses the proposal intelligence analysis. Analyze this response above, then start the evaluation.";
    case "analysis_running":
      return "Scoring will be available once the analysis above finishes.";
    case "analysis_failed":
      return "The analysis above failed, so there is nothing to score yet. Retry it, then start the evaluation.";
    case "coverage_blocked":
      return "Scoring is blocked until every page of this response's files can be read. Ask the vendor for a text-based copy, or add the missing figures manually.";
    case "ready":
      return "No evaluation has been started for this version. Start one to score it against your approved criteria.";
  }
};

export const evaluationCanStart = (gate: EvaluationGate) =>
  gate.state === "ready" || gate.state === "unknown";
