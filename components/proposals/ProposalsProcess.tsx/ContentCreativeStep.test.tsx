import { fireEvent, render, screen, within } from "@testing-library/react";

import ContentCreativeStep, { defaultContentCreative } from "./ContentCreativeStep";

const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: {},
} as never;

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

test("assigns opening videos and motion assets independently", () => {
  const onChange = renderStep();
  const openingRow = screen.getByText("Opening / Closing Video").closest(".py-4");
  const motionRow = screen.getByText("Motion Graphics / Stingers / Speaker Bumpers").closest(".py-4");
  if (!openingRow || !motionRow) throw new Error("Ownership rows must render");

  fireEvent.click(within(openingRow as HTMLElement).getByRole("button", { name: "AV Vendor" }));
  fireEvent.click(within(motionRow as HTMLElement).getByRole("button", { name: "Client" }));

  expect(onChange).toHaveBeenCalledWith({ openingClosingVideo: "AV Vendor" });
  expect(onChange).toHaveBeenCalledWith({ motionGraphicsStingersBumpers: "Client / Internal Team" });
});

test("shows one legacy combined fallback without duplicating it into new rows", () => {
  renderStep({ motionGraphicsOpenerVideo: "AV Vendor" });
  expect(screen.getByText(/Legacy Motion Graphics \/ Opener Video owner:/)).toHaveTextContent("AV Vendor");
});

test("continues directly to venue technical while standalone recording is retired", () => {
  renderStep();

  expect(
    screen.getByRole("button", { name: "Venue & Technical" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Video Recording" }),
  ).not.toBeInTheDocument();
});
