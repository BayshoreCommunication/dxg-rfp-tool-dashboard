/** @jest-environment node */

import { NextRequest } from "next/server";
import { GET } from "./route";

const VERSION_ID = "507f1f77bcf86cd799439011";
const PROPOSAL_ID = "507f1f77bcf86cd799439012";

describe("vendor submission receipt BFF", () => {
  afterEach(() => jest.restoreAllMocks());

  test("forwards only the scoped receipt identifiers and public grant", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { versionNumber: 2 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const request = new NextRequest(
      `http://localhost:3000/api/vendor-responses/receipt/${VERSION_ID}?proposalId=${PROPOSAL_ID}&email=VENDOR%40EXAMPLE.COM&accessGrant=opaque-grant&ignored=private`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ versionId: VERSION_ID }),
    });

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain(`/api/vendor-responses/receipt/${VERSION_ID}?`);
    expect(String(url)).toContain(`proposalId=${PROPOSAL_ID}`);
    expect(String(url)).toContain("email=vendor%40example.com");
    expect(String(url)).toContain("accessGrant=opaque-grant");
    expect(String(url)).not.toContain("ignored");
    expect(init).toEqual(expect.objectContaining({ cache: "no-store" }));
    expect(await response.json()).toEqual({
      success: true,
      data: { versionNumber: 2 },
    });
  });

  test("rejects malformed identifiers before calling the backend", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    const request = new NextRequest(
      "http://localhost:3000/api/vendor-responses/receipt/not-an-id?proposalId=bad&email=bad",
    );

    const response = await GET(request, {
      params: Promise.resolve({ versionId: "not-an-id" }),
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
