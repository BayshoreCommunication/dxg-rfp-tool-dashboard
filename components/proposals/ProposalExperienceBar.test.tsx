import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProposalExperienceBar from "./ProposalExperienceBar";

describe("ProposalExperienceBar", () => {
  test("switches modes and exposes one readiness progress indicator", async () => {
    const user = userEvent.setup();
    const onModeChange = jest.fn();

    render(
      <ProposalExperienceBar
        mode="basic"
        onModeChange={onModeChange}
        completedSteps={2}
        totalSteps={5}
        issues={[]}
        onIssueClick={jest.fn()}
      />,
    );

    expect(screen.getByRole("progressbar", { name: "Proposal readiness progress" }))
      .toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByRole("button", { name: "Basic mode" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Advanced production" }));
    expect(onModeChange).toHaveBeenCalledWith("advanced");
  });

  test("opens a clickable remaining-items checklist", async () => {
    const user = userEvent.setup();
    const onIssueClick = jest.fn();
    const issue = {
      id: "event-name",
      stepId: 1,
      section: "Event Overview",
      label: "Add the event name",
    };

    render(
      <ProposalExperienceBar
        mode="basic"
        onModeChange={jest.fn()}
        completedSteps={0}
        totalSteps={5}
        issues={[issue]}
        onIssueClick={onIssueClick}
      />,
    );

    await user.click(screen.getByText("1 item remaining"));
    await user.click(screen.getByRole("button", { name: /Event Overview Add the event name/ }));
    expect(onIssueClick).toHaveBeenCalledWith(issue);
  });
});
