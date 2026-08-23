import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { createEvaluationAction, prepareAutomaticEvaluationAction } from "./evaluationEngine";

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));

test("maps incomplete source coverage to a safe actionable evaluation message", async () => {
  jest.mocked(authenticatedBackendFetch).mockResolvedValue({
    ok: false,
    status: 409,
    json: async () => ({ code: "INTELLIGENCE_COVERAGE_INCOMPLETE", title: "unsafe backend detail" }),
  } as Response);

  await expect(createEvaluationAction("proposal", "submission", "version", false)).resolves.toEqual({
    success: false,
    code: "INTELLIGENCE_COVERAGE_INCOMPLETE",
    message: "Resolve every partial, unreadable, unavailable, or truncated response source before scoring this vendor.",
  });
});

test("requests one automatic evidence review and scorecard operation", async () => {
  jest.mocked(authenticatedBackendFetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: {
      run: { runId: "run-1", status: "ready" },
      permission: { owner: true, assigned: true, canViewCommercial: true },
      assignment: { assignmentId: "assignment-1", conflictStatus: "not_applicable", complete: true },
    } }),
  } as Response);

  const result = await prepareAutomaticEvaluationAction("proposal", "submission", "version");

  expect(result).toEqual(expect.objectContaining({
    success: true,
    data: expect.objectContaining({ assignment: expect.objectContaining({ conflictStatus: "not_applicable", complete: true }) }),
  }));
  expect(authenticatedBackendFetch).toHaveBeenCalledWith(
    "http://backend.test/api/v1/proposals/proposal/intelligence/submissions/submission/versions/version/evaluation-runs/automatic",
    expect.objectContaining({ method: "POST", cache: "no-store" }),
  );
});
