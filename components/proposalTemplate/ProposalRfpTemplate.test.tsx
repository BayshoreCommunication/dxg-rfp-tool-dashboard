import { renderToStaticMarkup } from "react-dom/server";

import ProposalRfpTemplate from "./ProposalRfpTemplate";

test("does not expose the buyer's estimated budget to vendors", () => {
  const html = renderToStaticMarkup(
    <ProposalRfpTemplate
      proposal={{
        event: { eventName: "Private Budget Summit", attendees: "250" },
        venueSchedule: { numberOfEventRooms: "3" },
        budget: {
          estimatedAvBudget: "DO_NOT_SHARE_BUDGET",
          proposalSubmissionDueDate: "2026-08-20",
        },
        roomByRoom: [],
      }}
    />,
  );

  expect(html).not.toContain("Budget Tier");
  expect(html).not.toContain("DO_NOT_SHARE_BUDGET");
  expect(html).toContain("Response Due");
});

test("uses RFPilot instead of the proposal link prefix in page chrome", () => {
  const html = renderToStaticMarkup(
    <ProposalRfpTemplate
      proposal={{
        event: { eventName: "General AV Services RFP" },
        proposalSettings: { linkPrefix: "abuco" },
        roomByRoom: [],
      }}
    />,
  );

  expect(html).not.toContain("abuco | RFPilot");
  expect(html).not.toContain("abuco<!-- --> | RFPilot");
  expect(html).toContain("RFPilot — General AV Services RFP — CONFIDENTIAL");
});

test("renders every room on its own page so detailed specifications cannot collide", () => {
  const rooms = Array.from({ length: 5 }, (_, index) => ({
    roomLocation: `Room ${index + 1}`,
    cameras: { cameras: "Yes", cameraCount: "4" },
  }));
  const html = renderToStaticMarkup(
    <ProposalRfpTemplate
      proposal={{ event: { eventName: "Room Test" }, roomByRoom: rooms }}
    />,
  );

  expect((html.match(/data-room-page=/g) || [])).toHaveLength(5);
  expect(html).toContain("Room 5 of 5");
});
