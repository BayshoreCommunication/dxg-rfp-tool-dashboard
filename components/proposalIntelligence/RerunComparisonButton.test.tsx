import { fireEvent, render, screen } from "@testing-library/react";
import { COMPARISON_PANEL_ANCHOR, START_COMPARISON_EVENT } from "@/lib/proposalIntelligence/rerun";
import RerunComparisonButton from "./RerunComparisonButton";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
  document.body.innerHTML = "";
});

it("starts the run through the panel when it is on the page, and scrolls to it", () => {
  const panel = document.createElement("h3");
  panel.id = COMPARISON_PANEL_ANCHOR;
  panel.scrollIntoView = jest.fn();
  document.body.appendChild(panel);
  const started = jest.fn();
  window.addEventListener(START_COMPARISON_EVENT, started);
  render(<RerunComparisonButton proposalId="proposal-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Run a new comparison" }));
  expect(started).toHaveBeenCalledTimes(1);
  expect(panel.scrollIntoView).toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  window.removeEventListener(START_COMPARISON_EVENT, started);
});

it("sends the reader to the panel with a run requested when it is on another page", () => {
  render(<RerunComparisonButton proposalId="proposal-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Run a new comparison" }));
  expect(push).toHaveBeenCalledWith("/proposals/proposal-1/intelligence?rerun=1#comparison-progress-title");
});
