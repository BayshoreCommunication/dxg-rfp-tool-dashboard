import { fireEvent, render, screen } from "@testing-library/react";

import ProposalFinalReview from "./ProposalFinalReview";
import type { BudgetData, ContactData, EventData, RoomByRoomData } from "./AddNewProposal";
import type { VenueScheduleData } from "./ProposalsProcess.tsx/VenueScheduleStep";

const noop = jest.fn();

test("summarizes vendor-visible scope without exposing planning estimates", () => {
  render(
    <ProposalFinalReview
      event={{ eventName: "Summit", eventFormat: "In-Person", attendees: "300", startDate: "2026-09-01", endDate: "2026-09-02", eventType: { eventType: "Conference" } } as EventData}
      venue={{ venueName: "Grand Hall", venueCity: "Austin", venueState: "TX" } as VenueScheduleData}
      rooms={[{ roomLocation: "General Session", roomFunction: "Keynote" } as RoomByRoomData]}
      budget={{ estimatedAvBudget: "Standard", proposalSubmissionDueDate: "2026-08-10", vendorSelectionDate: "2026-08-20" } as BudgetData}
      contact={{ contactFirstName: "Taylor", contactLastName: "Reed", contactOrganization: "DXG", contactEmail: "taylor@example.com", additionalContacts: [] } as unknown as ContactData}
      issues={[]}
      provenance={{ roomByRoom: { source: "assumed", confidence: 0.86, explanation: "Template applied." } }}
      assumptions={["Recording remains unspecified."]}
      assumptionsApproved={false}
      onAssumptionsApprovedChange={noop}
      onEditStep={noop}
    />,
  );

  expect(screen.getByText("Required information complete")).toBeInTheDocument();
  expect(screen.getByText("Procurement timeline")).toBeInTheDocument();
  expect(screen.queryByText("AI planning estimate")).not.toBeInTheDocument();
  expect(screen.queryByText("Standard")).not.toBeInTheDocument();
  expect(screen.getByText("Assumed · 86%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(noop).toHaveBeenCalledWith(true);

  noop.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Edit Primary contact" }));
  expect(noop).toHaveBeenCalledWith(10, "primary-contact-section");

  noop.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Edit Invitation recipients" }));
  expect(noop).toHaveBeenCalledWith(10, "invitation-recipients-section");
});

test("keeps drafting tools and AI activity out of the final review", () => {
  // The statement of work is written and generated in Event Overview, and the
  // AI activity log is a working aid; neither belongs on the page whose only
  // job is confirming what vendors receive and publishing.
  render(
    <ProposalFinalReview
      event={{ eventName: "Summit", eventType: { eventType: "Annual Meeting" }, statementOfWork: "Provide audiovisual production for the annual meeting." } as EventData}
      venue={{} as VenueScheduleData}
      rooms={[]}
      budget={{} as BudgetData}
      contact={{ additionalContacts: [] } as unknown as ContactData}
      issues={[]}
      provenance={{}}
      assumptions={[]}
      assumptionsApproved={false}
      onAssumptionsApprovedChange={noop}
      onEditStep={noop}
    />,
  );
  expect(screen.queryByText("Vendor-ready statement of work")).not.toBeInTheDocument();
  expect(screen.queryByText("AI activity and assumptions")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /generate draft|regenerate draft/i })).not.toBeInTheDocument();
  expect(screen.getByText(/Choosing which vendors to invite is the step right after/)).toBeInTheDocument();
});
