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
      auditTrail={[{ id: "1", label: "Applied General Session template", source: "assumed", createdAt: "2026-08-11T00:00:00.000Z" }]}
      assumptions={["Recording remains unspecified."]}
      assumptionsApproved={false}
      onAssumptionsApprovedChange={noop}
      onEditStep={noop}
      onGenerateStatementOfWork={noop}
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
