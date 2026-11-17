/** @jest-environment node */

import { auth } from "@/auth";
import { getVendorSubmissionDetailAction } from "@/app/actions/vendorResponse";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { generateProposalPdf } from "@/lib/server/proposalPdf";
import type { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));
jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/server/proposalPdf", () => ({ generateProposalPdf: jest.fn() }));
jest.mock("@/app/actions/vendorResponse", () => ({ getVendorSubmissionDetailAction: jest.fn() }));

const authMock = auth as jest.MockedFunction<typeof auth>;
const fetchMock = authenticatedBackendFetch as jest.MockedFunction<typeof authenticatedBackendFetch>;
const pdfMock = generateProposalPdf as jest.MockedFunction<typeof generateProposalPdf>;
const detailMock = getVendorSubmissionDetailAction as jest.MockedFunction<typeof getVendorSubmissionDetailAction>;

const id = "6af561c96f0e7677a6e074b5";
const versionId = "6af57f0870f028dc79bb1b92";
const call = (format: string, cookie = "session=abc") =>
  GET(
    {
      headers: new Headers({ cookie }),
      nextUrl: new URL(`https://av-rfpilot.com/api/vendor-responses/${id}/submission-export?versionId=${versionId}&format=${format}`),
      signal: undefined,
    } as unknown as NextRequest,
    { params: Promise.resolve({ id }) },
  );

const detail = (structured = true) =>
  ({
    success: true,
    data: { versions: [{ versionId, versionNumber: 2, vendorName: "Apex AV & Media", structuredResponse: structured ? {} : null }] },
  }) as never;

describe("GET submission-export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    pdfMock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]) as never);
    detailMock.mockResolvedValue(detail());
  });

  it("prints the review page, the same document Print view opens, with the planner's session", async () => {
    const response = await call("pdf");

    expect(pdfMock).toHaveBeenCalledWith({
      url: `https://av-rfpilot.com/response-review/${id}?versionId=${versionId}`,
      cookie: "session=abc",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="apex-av-media-response-v2.pdf"');
  });

  it("checks access before launching Chrome", async () => {
    detailMock.mockResolvedValue({ success: false, message: "You don't have access to this proposal" } as never);
    const response = await call("pdf");

    expect(response.status).toBe(404);
    expect(pdfMock).not.toHaveBeenCalled();
  });

  it("refuses a version without a structured response", async () => {
    detailMock.mockResolvedValue(detail(false));
    expect((await call("pdf")).status).toBe(404);
    expect(pdfMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the PDF cannot be rendered", async () => {
    pdfMock.mockRejectedValue(new Error("no chrome"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("pdf")).status).toBe(500);
  });

  it("keeps the HTML and JSON exports as backend passthroughs", async () => {
    fetchMock.mockResolvedValue(new Response("<html></html>", { headers: { "content-type": "text/html" } }));
    const html = await call("html");
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(fetchMock.mock.calls[0][0]).toContain("format=html");

    fetchMock.mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } }));
    await call("json");
    expect(fetchMock.mock.calls[1][0]).toContain("format=json");
    expect(pdfMock).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    authMock.mockResolvedValue(null as never);
    expect((await call("pdf")).status).toBe(401);
    expect(detailMock).not.toHaveBeenCalled();
  });
});
