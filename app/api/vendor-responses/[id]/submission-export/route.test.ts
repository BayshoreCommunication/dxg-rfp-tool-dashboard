/** @jest-environment node */

import { auth } from "@/auth";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { renderHtmlToPdf } from "@/lib/server/proposalPdf";
import type { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));
jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/server/proposalPdf", () => ({ renderHtmlToPdf: jest.fn() }));

const authMock = auth as jest.MockedFunction<typeof auth>;
const fetchMock = authenticatedBackendFetch as jest.MockedFunction<typeof authenticatedBackendFetch>;
const pdfMock = renderHtmlToPdf as jest.MockedFunction<typeof renderHtmlToPdf>;

const id = "6af561c96f0e7677a6e074b5";
const versionId = "6af57f0870f028dc79bb1b92";
const call = (format: string) =>
  GET(
    {
      nextUrl: new URL(`http://localhost:3000/api/vendor-responses/${id}/submission-export?versionId=${versionId}&format=${format}`),
      signal: undefined,
    } as unknown as NextRequest,
    { params: Promise.resolve({ id }) },
  );

const htmlUpstream = () =>
  new Response("<html><body>review</body></html>", {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": 'attachment; filename="acme-v1.html"',
    },
  });

describe("GET submission-export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    pdfMock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]) as never);
  });

  it("downloads the review as a PDF printed from the backend's HTML", async () => {
    fetchMock.mockResolvedValue(htmlUpstream());
    const response = await call("pdf");

    expect(fetchMock.mock.calls[0][0]).toContain("format=html");
    expect(pdfMock).toHaveBeenCalledWith("<html><body>review</body></html>");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="acme-v1.pdf"');
  });

  it("passes a backend refusal through instead of printing it", async () => {
    fetchMock.mockResolvedValue(new Response("Forbidden", { status: 403 }));
    const response = await call("pdf");

    expect(response.status).toBe(403);
    expect(pdfMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the PDF cannot be rendered", async () => {
    fetchMock.mockResolvedValue(htmlUpstream());
    pdfMock.mockRejectedValue(new Error("no chrome"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("pdf")).status).toBe(500);
  });

  it("keeps the HTML and JSON exports unchanged", async () => {
    fetchMock.mockResolvedValue(htmlUpstream());
    const html = await call("html");
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(pdfMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } }));
    await call("json");
    expect(fetchMock.mock.calls[1][0]).toContain("format=json");
  });

  it("requires a session", async () => {
    authMock.mockResolvedValue(null as never);
    expect((await call("pdf")).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
