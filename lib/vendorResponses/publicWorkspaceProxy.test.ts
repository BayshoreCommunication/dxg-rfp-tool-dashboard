/** @jest-environment node */

import { NextRequest } from "next/server";
import { publicWorkspaceProxy } from "./publicWorkspaceProxy";

describe("publicWorkspaceProxy", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("rejects requests without both proposal scope and an invitation grant", async () => {
    const response = await publicWorkspaceProxy(
      new NextRequest(
        "http://localhost/api/vendor-responses/drafts?proposalId=6a7aa6f2c7e1575700216e0a",
      ),
      "/drafts",
      { method: "POST", body: "{}" },
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("forwards the grant in a backend header without adding it to the URL", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { draftId: "draft-1" } }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      );
    global.fetch = mockFetch as typeof fetch;
    const request = new NextRequest(
      "http://localhost/api/vendor-responses/drafts?proposalId=6a7aa6f2c7e1575700216e0a",
      { headers: { "x-rfpilot-access-grant": "secure-grant" } },
    );

    const response = await publicWorkspaceProxy(request, "/drafts", {
      method: "POST",
      body: "{}",
    });

    expect(response.status).toBe(201);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain(
      "/api/vendor-responses/drafts?proposalId=6a7aa6f2c7e1575700216e0a",
    );
    expect(url).not.toContain("secure-grant");
    expect(init.headers["x-rfpilot-access-grant"]).toBe("secure-grant");
  });

  it("lets fetch set the multipart boundary for document uploads", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      );
    global.fetch = mockFetch as typeof fetch;
    const request = new NextRequest(
      "http://localhost/api/vendor-responses/drafts/6b7aa6f2c7e1575700216e0b/documents?proposalId=6a7aa6f2c7e1575700216e0a",
      { headers: { "x-rfpilot-access-grant": "secure-grant" } },
    );
    const body = new FormData();
    body.set("purposeId", "insurance");

    await publicWorkspaceProxy(
      request,
      "/drafts/6b7aa6f2c7e1575700216e0b/documents",
      { method: "POST", body },
    );

    const [, init] = mockFetch.mock.calls[0];
    expect(init.body).toBe(body);
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.headers["x-rfpilot-access-grant"]).toBe("secure-grant");
  });
});
