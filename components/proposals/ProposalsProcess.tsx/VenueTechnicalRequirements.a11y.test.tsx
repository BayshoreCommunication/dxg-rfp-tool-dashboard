import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import VenueTechnicalRequirements from "./VenueTechnicalRequirements";

const settings = { branding: { linkPrefix: "", defaultFont: "Inter" }, proposals: {} } as never;

const renderStep = (data: Record<string, unknown> = {}, showErrors = false) => {
  const onChange = jest.fn();
  render(
    <VenueTechnicalRequirements
      data={data as never}
      onChange={onChange}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={showErrors}
      proposalSettings={settings}
    />,
  );
  return onChange;
};

describe("VenueTechnicalRequirements accessibility wiring", () => {
  test("text fields are reachable by their visible label", () => {
    renderStep();
    for (const name of [/^Contact Name/, /^Phone/, /^Email/, /^In-House AV Company Name/, /^COI Requirements/, /^Venue Access Requirements/]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  test("each Yes/No question is a named group that exposes the current answer", async () => {
    const onChange = renderStep({ riggingRequired: "YES", powerDropsRequired: "NO" });
    const rigging = screen.getByRole("group", { name: /Rigging Required/ });
    expect(within(rigging).getByRole("button", { name: /Yes/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(rigging).getByRole("button", { name: /No/ })).toHaveAttribute("aria-pressed", "false");
    for (const name of [/Truss and Motors/, /Lifts Exclusively/, /Power Drops Required/, /Wireless Internet Required/]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
    await userEvent.click(within(rigging).getByRole("button", { name: /No/ }));
    expect(onChange).toHaveBeenCalled();
  });

  test("power-drop details: amperage choice and stepper are named", () => {
    renderStep({ powerDropsRequired: "YES", powerDropAmperage: "200A", numberOfPowerDrops: "3" });
    const amperage = screen.getByRole("group", { name: /Amperage per Drop/ });
    expect(within(amperage).getByRole("button", { name: "200A" })).toHaveAttribute("aria-pressed", "true");
    const stepper = screen.getByRole("group", { name: "Number of power drops" });
    expect(within(stepper).getByRole("button", { name: "Increase number of power drops" })).toBeInTheDocument();
    expect(within(stepper).getByRole("button", { name: "Decrease number of power drops" })).toBeInTheDocument();
  });

  test("no dangling references, duplicate ids or buttons inside labels; errors are announced", () => {
    renderStep({ powerDropsRequired: "YES", wirelessInternetRequired: "YES" }, true);
    expect(danglingReferences()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
    expect(buttonsInsideLabels()).toBe(0);
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});
