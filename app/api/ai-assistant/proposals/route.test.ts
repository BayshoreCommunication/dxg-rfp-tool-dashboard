/** @jest-environment node */

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { GET } from "./route";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const PROPOSAL_ID = "abc123abc123abc123abc123";

describe("AI Assistant proposal handoff BFF", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns only a bounded authorized proposal projection", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              _id: PROPOSAL_ID,
              event: {
                eventName: "Annual Summit",
                eventObjectives: "Private objective",
              },
              contact: { contactEmail: "private@example.com" },
              status: "submitted",
              isActive: true,
            },
            { _id: "../../settings", event: { eventName: "Unsafe" } },
          ],
        }),
        { status: 200 },
      ),
    );

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      data: [
        {
          id: PROPOSAL_ID,
          label: "Annual Summit",
          canEmail: true,
        },
      ],
      correlationId: expect.any(String),
    });
    const [url, init] = mockedFetch.mock.calls[0]!;
    expect(String(url)).toContain("/api/proposals?");
    expect(String(url)).toContain("archived=false");
    expect(String(url)).toContain("isCopy=false");
    expect(init).toEqual(
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });

  test("does not expose upstream errors or proposal data", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Database details",
          data: [{ contact: { contactEmail: "private@example.com" } }],
        }),
        { status: 500 },
      ),
    );

    const response = await GET();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        code: "PROPOSAL_HANDOFF_UNAVAILABLE",
        message: "Available proposals could not be loaded.",
      }),
    );
  });
});
