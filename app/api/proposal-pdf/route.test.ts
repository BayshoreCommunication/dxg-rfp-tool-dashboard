/** @jest-environment node */

import { auth } from "@/auth";
import { generateProposalPdf } from "@/lib/server/proposalPdf";
import type { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/server/proposalPdf", () => ({
  generateProposalPdf: jest.fn(),
}));

const authMock = auth as jest.MockedFunction<typeof auth>;
const generateMock = generateProposalPdf as jest.MockedFunction<
  typeof generateProposalPdf
>;

const request = (params: Record<string, string>, headers?: Record<string, string>) =>
  ({
    headers: new Headers(headers),
    nextUrl: new URL(
      `http://localhost:3000/api/proposal-pdf?${new URLSearchParams(params)}`,
    ),
  }) as unknown as NextRequest;

describe("GET /api/proposal-pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-1" } } as never);
    generateMock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  });

  it("rejects arbitrary URLs instead of turning the renderer into an SSRF proxy", async () => {
    const response = await GET(
      request({ path: "https://example.com/private", filename: "x.pdf" }),
    );

    expect(response.status).toBe(400);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("requires a session for signed-in proposal pages", async () => {
    authMock.mockResolvedValue(null as never);
    const response = await GET(
      request({ path: "/proposal/northstar-507f1f77bcf86cd799439011" }),
    );

    expect(response.status).toBe(401);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("returns a one-click PDF generated from the authenticated print page", async () => {
    const response = await GET(
      request(
        {
          path: "/proposal/northstar-507f1f77bcf86cd799439011",
          filename: "Northstar Leadership Summit.pdf",
        },
        { cookie: "session=secret" },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="Northstar-Leadership-Summit.pdf"',
    );
    expect(generateMock).toHaveBeenCalledWith({
      url: "http://localhost:3000/proposal/northstar-507f1f77bcf86cd799439011",
      cookie: "session=secret",
    });
  });
});
