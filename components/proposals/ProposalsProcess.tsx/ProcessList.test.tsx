import { render, screen } from "@testing-library/react";
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
      screen.getByRole("button", { name: "Go to Contact & Submit" }),
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
});
