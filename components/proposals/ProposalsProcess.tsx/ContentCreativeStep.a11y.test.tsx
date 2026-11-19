import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import ContentCreativeStep, { defaultContentCreative } from "./ContentCreativeStep";

const settings = { branding: { linkPrefix: "", defaultFont: "Inter" }, proposals: {} } as never;

const renderStep = (overrides = {}) => {
  const onChange = jest.fn();
  render(
    <ContentCreativeStep
      data={{ ...defaultContentCreative(), contentServicesNeeded: "YES", ...overrides }}
      onChange={onChange}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={false}
      proposalSettings={settings}
    />,
  );
  return onChange;
};

describe("ContentCreativeStep accessibility wiring", () => {
  test("the services choice is a named group whose selected card is pressed", () => {
    renderStep();
    const group = screen.getByRole("group", { name: /Content \/ Creative Services Needed/ });
    const [yes, no] = within(group).getAllByRole("button");
    expect(yes).toHaveAttribute("aria-pressed", "true");
    expect(no).toHaveAttribute("aria-pressed", "false");
  });

  test("each ownership row is a named group and exposes the selected owner", async () => {
    const onChange = renderStep({ openingClosingVideo: "AV Vendor" });
    const group = screen.getByRole("group", { name: "Opening / Closing Video" });
    expect(within(group).getByRole("button", { name: "AV Vendor" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Client" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(within(group).getByRole("button", { name: "TBD" }));
    expect(onChange).toHaveBeenCalledWith({ openingClosingVideo: "TBD" });
  });

  test("live data feeds choice and creative notes are labelled", () => {
    renderStep({ liveDataFeeds: { needed: "YES", ownership: "TBD" } });
    const feeds = screen.getByRole("group", { name: /Live Data Feeds/ });
    expect(within(feeds).getByRole("button", { name: /Yes/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Live data feed ownership" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Creative Direction Notes/)).toBeInTheDocument();
  });

  test("no dangling references, duplicate ids or buttons inside labels", () => {
    renderStep({ liveDataFeeds: { needed: "YES", ownership: "" } });
    expect(danglingReferences()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
    expect(buttonsInsideLabels()).toBe(0);
  });
});
