/** @jest-environment node */

import { NextRequest } from "next/server";
import { POST } from "./route";

describe("vendor draft document upload BFF", () => {
  afterEach(() => jest.restoreAllMocks());

  it("forwards multipart files with proposal and grant scope", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { documents: [] } }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      );
    const body = new FormData();
    body.set("draftRevision", "2");
    body.set("purposeId", "coi");
    body.set("scopeType", "proposal");
    body.append(
      "documents",
      new File(["pdf"], "insurance.pdf", { type: "application/pdf" }),
    );
    const request = new NextRequest(
      "http://localhost/api/vendor-responses/drafts/6b7aa6f2c7e1575700216e0b/documents?proposalId=6a7aa6f2c7e1575700216e0a",
      {
        method: "POST",
        headers: { "x-rfpilot-access-grant": "secure-grant" },
        body,
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ draftId: "6b7aa6f2c7e1575700216e0b" }),
    });

    expect(response.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("proposalId=6a7aa6f2c7e1575700216e0a");
    expect(String(url)).not.toContain("secure-grant");
    expect(
      (init?.headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();
    expect(
      (init?.headers as Record<string, string>)["x-rfpilot-access-grant"],
    ).toBe("secure-grant");
  });

  it("rejects malformed draft ids before forwarding files", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    const request = new NextRequest(
      "http://localhost/api/vendor-responses/drafts/no/documents?proposalId=6a7aa6f2c7e1575700216e0a",
      { method: "POST", body: new FormData() },
    );
    expect(
      (await POST(request, { params: Promise.resolve({ draftId: "no" }) }))
        .status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
