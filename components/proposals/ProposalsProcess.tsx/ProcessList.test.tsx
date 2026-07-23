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
});
