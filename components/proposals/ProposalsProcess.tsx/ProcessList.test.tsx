import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProcessList from "./ProcessList";

describe("ProcessList", () => {
  it("lets an editor navigate directly to any visible step", async () => {
    const user = userEvent.setup();
    const onStepChange = jest.fn();

    render(
      <ProcessList
        activeStep={1}
        hideStepIds={[4]}
        onStepChange={onStepChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Go to Contact & Publish" }),
    );

    expect(onStepChange).toHaveBeenCalledWith(10);
    expect(
      screen.queryByRole("button", { name: "Go to Hybrid & Virtual" }),
    ).not.toBeInTheDocument();
  });

  it("marks steps complete from real completion, not from being walked past", () => {
    // Standing on the last step used to paint every earlier step green, so a
    // check meant "you have been here" while reading as "this is done".
    const { rerender } = render(<ProcessList activeStep={10} completedStepIds={[1, 2]} />);
    const completedLabel = screen.getByText("Event Overview");
    const incompleteLabel = screen.getByText("Venue & Technical");
    expect(completedLabel.className).toContain("#10B981");
    expect(incompleteLabel.className).not.toContain("#10B981");

    // Without the prop the positional fallback still applies.
    rerender(<ProcessList activeStep={10} />);
    expect(screen.getByText("Venue & Technical").className).toContain("#10B981");
  });

  it("never paints the step the planner is standing on as complete", () => {
    render(<ProcessList activeStep={2} completedStepIds={[1, 2, 3]} />);
    expect(screen.getByText("Venue & Schedule").className).not.toContain("#10B981");
    expect(screen.getByText("Event Overview").className).toContain("#10B981");
  });

  it("connects each step through the center of its status circle", () => {
    const { container } = render(<ProcessList activeStep={2} />);
    const connectors = container.querySelectorAll("[data-step-connector]");

    expect(connectors).toHaveLength(
      screen.getAllByRole("button", { name: /^Go to / }).length - 1,
    );
    connectors.forEach((connector) => {
      expect(connector.className).toContain("left-7");
      expect(connector.className).toContain("top-1/2");
      expect(connector.className).toContain("h-[calc(100%+0.5rem)]");
      expect(connector.className).toContain("@min-[1000px]:block");
    });
  });

  it("uses a compact horizontal navigator before the desktop rail breakpoint", () => {
    render(<ProcessList activeStep={1} />);

    expect(screen.getByTestId("proposal-process-list")).toHaveClass(
      "border-b",
      "@min-[1000px]:min-h-screen",
      "@min-[1000px]:border-l",
    );
    expect(screen.getByTestId("proposal-step-scroller")).toHaveClass(
      "overflow-x-auto",
      "@min-[1000px]:flex-col",
      "@min-[1000px]:overflow-visible",
    );
    expect(screen.getByRole("button", { name: "Go to Event Overview" }).parentElement)
      .toHaveClass("min-w-[180px]", "@min-[1000px]:min-w-0");
  });

  it("uses sequential visible numbering without introducing a second progress indicator", () => {
    render(<ProcessList activeStep={3} hideStepIds={[4]} completedStepIds={[1, 2]} />);

    expect(screen.queryByText("2B")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("Workflow sections")).toBeInTheDocument();
  });

  it("hides the retired recording step while retaining later internal ids", async () => {
    const user = userEvent.setup();
    const onStepChange = jest.fn();
    render(
      <ProcessList
        activeStep={5}
        hideStepIds={[4, 6]}
        onStepChange={onStepChange}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Go to Video Recording" }),
    ).not.toBeInTheDocument();
    const venueTechnical = screen.getByRole("button", {
      name: "Go to Venue & Technical",
    });
    expect(within(venueTechnical).getByText("5")).toBeInTheDocument();

    await user.click(venueTechnical);
    expect(onStepChange).toHaveBeenCalledWith(7);
  });
});
