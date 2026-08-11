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
