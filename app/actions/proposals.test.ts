/** @jest-environment node */

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { createProposalAction, updateProposalAction } from "./proposals";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockedFetch = jest.mocked(authenticatedBackendFetch);

describe("proposal write actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockImplementation(async () =>
      Response.json({ message: "Saved", data: { _id: "proposal-1" } }),
    );
  });

  test("never sends retired standalone recording data from create or update", async () => {
    const stalePayload = {
      event: { eventName: "Annual Summit" },
      roomByRoom: [
        { videoRecording: { videoRecording: "Yes", recordingCodec: "H.264" } },
      ],
      videoRecordingStep: {
        videoRecordingRequired: "YES",
        deliveryMethod: ["RETIRED_SECRET"],
      },
      "videoRecordingStep.numberOfCameras": "99",
    };

    await createProposalAction(stalePayload as never);
    await updateProposalAction("proposal-1", stalePayload as never);

    for (const [, request] of mockedFetch.mock.calls) {
      const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
      expect(body).not.toHaveProperty("videoRecordingStep");
      expect(body).not.toHaveProperty("videoRecordingStep.numberOfCameras");
      expect(body.roomByRoom).toEqual(stalePayload.roomByRoom);
      expect(JSON.stringify(body)).not.toContain("RETIRED_SECRET");
    }
  });
});
