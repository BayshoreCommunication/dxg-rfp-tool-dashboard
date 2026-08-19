/** @jest-environment node */

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { GET } from "./route";

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));

const proposalId = "f".repeat(24);
const runId = "019ff44e-6fd9-7450-98a7-3ba8e912e61a";

beforeEach(() => jest.clearAllMocks());

test("streams an authenticated run-bound report with private response headers", async () => {
  jest.mocked(authenticatedBackendFetch).mockResolvedValue(new Response(Buffer.from("%PDF-fixture"), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=fixture.pdf", "X-RFPilot-Manifest-Checksum": "a".repeat(64) } }));
  const response = await GET(new Request("http://localhost/report"), { params: Promise.resolve({ proposalId, runId, reportType: "executive_pdf" }) });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-rfpilot-manifest-checksum")).toBe("a".repeat(64));
  expect(String(jest.mocked(authenticatedBackendFetch).mock.calls[0]![0])).toContain(`/comparisons/${runId}/reports/executive_pdf`);
});

test("rejects unknown report types before backend access", async () => {
  const response = await GET(new Request("http://localhost/report"), { params: Promise.resolve({ proposalId, runId, reportType: "raw_vendor_files" }) });
  expect(response.status).toBe(404);
  expect(authenticatedBackendFetch).not.toHaveBeenCalled();
});
