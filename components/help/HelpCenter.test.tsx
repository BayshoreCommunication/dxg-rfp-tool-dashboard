import { render, screen, within } from "@testing-library/react";
import HelpCenter from "./HelpCenter";
import { glossaryTermCount } from "@/lib/proposalIntelligence/glossary";

describe("HelpCenter", () => {
  test("explains what RFPilot is and walks the flow from event to decision", () => {
    render(<HelpCenter />);
    expect(screen.getByRole("heading", { level: 1, name: "How RFPilot works" })).toBeInTheDocument();
    expect(
      screen.getByText(/RFPilot turns your event details into an AV production RFP/),
    ).toBeInTheDocument();

    const flow = screen.getByRole("region", { name: "From event to decision" });
    const steps = within(flow).getAllByRole("listitem");
    expect(steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "Step 1: Describe your event",
      "Step 2: Answer what's missing",
      "Step 3: Review the draft",
      "Step 4: Publish",
      "Step 5: Email vendors",
      "Step 6: Compare responses and decide",
    ]);
    // The two promises new users most need: publish does not email, and
    // the ranking is advisory.
    expect(steps[3]).toHaveTextContent("It does not email anyone.");
    expect(steps[5]).toHaveTextContent("The ranking is advisory; the decision you record is the official outcome.");
  });

  test("offers the demo in a new tab and the example brief in the product", () => {
    render(<HelpCenter />);
    const demo = screen.getByRole("link", { name: /Watch the interactive demo/ });
    expect(demo).toHaveAttribute("href", "https://demo.av-rfpilot.com");
    expect(demo).toHaveAttribute("target", "_blank");
    expect(demo).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: /Start with the example brief/ })).toHaveAttribute(
      "href",
      "/proposals/add-new-proposal",
    );
  });

  test("links every primary area and renders the full glossary inline", () => {
    render(<HelpCenter />);
    const places = screen.getByRole("region", { name: "Where things live" });
    expect(within(places).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/proposals",
      "/email",
      "/vendor-responses",
      "/settings",
    ]);

    const glossary = screen.getByRole("region", { name: "What the words mean" });
    expect(glossary).toHaveTextContent(`Plain definitions for the ${glossaryTermCount} terms`);
    expect(within(glossary).getAllByRole("term")).toHaveLength(glossaryTermCount);
    expect(within(glossary).getByText("Proposal Intelligence", { selector: "dt" })).toBeInTheDocument();
  });
});
