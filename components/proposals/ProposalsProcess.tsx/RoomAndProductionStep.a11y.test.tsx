import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ProposalSettings } from "../AddNewProposal";
import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import RoomAndProductionStep, { defaultRoom } from "./RoomAndProductionStep";

jest.mock("@/app/actions/proposals", () => ({ normalizeScheduleTimesAction: jest.fn() }));

const proposalSettings: ProposalSettings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: { proposalLanguage: "English", defaultCurrency: "USD", expiryDate: "", priceSeparator: ",", dateFormat: "MM-DD-YYYY", decimalPrecision: "2" },
};

const renderStep = async (roomCount = 2, showErrors = true) => {
  const rooms = Array.from({ length: roomCount }, () => ({ ...defaultRoom() }));
  render(
    <RoomAndProductionStep
      rooms={rooms}
      onRoomsChange={jest.fn()}
      numberOfEventRooms={String(roomCount)}
      onNumberOfEventRoomsChange={jest.fn()}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={showErrors}
      proposalSettings={proposalSettings}
      mode="advanced"
    />,
  );
  // Open every collapsed room so all copies of the form are in the DOM.
  for (const toggle of screen.queryAllByRole("button").filter((b) => b.getAttribute("aria-expanded") === "false")) {
    await userEvent.click(toggle);
  }
};

describe("RoomAndProductionStep accessibility wiring", () => {
  test("the number of event rooms control is named", async () => {
    await renderStep(1);
    const group = screen.getByRole("group", { name: /Number of Event Rooms/ });
    expect(within(group).getByRole("button", { name: "Decrease number of event rooms" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Increase number of event rooms" })).toBeInTheDocument();
    expect(within(group).getByRole("spinbutton", { name: /Number of Event Rooms/ })).toBeInTheDocument();
  });

  test("a room's text fields and Yes/No questions are labelled", async () => {
    await renderStep(1);
    expect(screen.getAllByLabelText(/^Physical Room Name/).length).toBeGreaterThan(0);
    for (const name of [/Audio System Required/, /LED Wall Required/, /Cameras\?/, /Teleprompter Required/]) {
      const groups = screen.getAllByRole("group", { name });
      expect(within(groups[0]).getAllByRole("button")).toHaveLength(2);
      expect(within(groups[0]).getAllByRole("button")[0]).toHaveAttribute("aria-pressed");
    }
  });

  test("every Yes/No group in every room has an accessible name", async () => {
    await renderStep(2);
    const unnamed = screen
      .getAllByRole("group")
      .filter((g) => within(g).queryAllByRole("button", { name: /Yes/ }).length > 0 && !g.getAttribute("aria-labelledby"));
    expect(unnamed).toHaveLength(0);
  });

  test("two rooms never share an id; labels, groups and tooltips resolve cleanly", async () => {
    await renderStep(2);
    expect(duplicateIds()).toEqual([]);
    expect(danglingReferences()).toEqual([]);
    expect(buttonsInsideLabels()).toBe(0);
    expect(screen.getAllByLabelText(/^Physical Room Name/)).toHaveLength(2);
  });
});
