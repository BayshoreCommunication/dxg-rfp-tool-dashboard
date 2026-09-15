import { render, screen, within } from "@testing-library/react";
import FirstRunDashboard from "./FirstRunDashboard";

describe("FirstRunDashboard", () => {
  test("says what the product is and offers the three starters plus help", () => {
    render(<FirstRunDashboard />);
    const card = screen.getByRole("region", { name: "Create your first RFP" });
    expect(card).toHaveTextContent(
      "RFPilot turns your event details into an AV production RFP, the request you send to vendors so they can quote.",
    );
    const starters = within(card).getByRole("group", { name: "Ways to start" });
    expect(within(starters).getAllByRole("link")).toHaveLength(3);
    expect(within(card).getByRole("link", { name: /Read how RFPilot works/ })).toHaveAttribute("href", "/help");
    // No zero-value metrics anywhere on the first-run card.
    expect(card).not.toHaveTextContent(/Total Email/);
  });
});
