import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { createEvaluationAction } from "./evaluationEngine";

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
