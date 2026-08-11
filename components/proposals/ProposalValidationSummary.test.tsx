import { render, screen } from "@testing-library/react";

import ProposalValidationSummary from "./ProposalValidationSummary";

describe("ProposalValidationSummary", () => {
  it("names the current section and lists every issue", () => {
    render(
      <ProposalValidationSummary
        section="Contact & Publish"
        issues={["Contact email", "Organization legal name"]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Contact & Publish needs 2 items");
    expect(screen.getByText("Contact email")).toBeInTheDocument();
    expect(screen.getByText("Organization legal name")).toBeInTheDocument();
  });

  it("renders nothing when the section is complete", () => {
    const { container } = render(
      <ProposalValidationSummary section="Event Overview" issues={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
