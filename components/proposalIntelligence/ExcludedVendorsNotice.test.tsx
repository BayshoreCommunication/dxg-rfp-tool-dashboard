import { render, screen } from "@testing-library/react";
import ExcludedVendorsNotice from "./ExcludedVendorsNotice";

it("renders nothing when every response made it into the comparison", () => {
  const { container } = render(
    <ExcludedVendorsNotice excluded={[]} comparedCount={2} />,
  );
  expect(container).toBeEmptyDOMElement();
});

it("names the missing vendor with a one-line reason and no button", () => {
  render(
    <ExcludedVendorsNotice
      comparedCount={2}
      excluded={[{
        responseId: "response-dxg",
        vendorLabel: "Digital Experience Group",
        reason: "sources_unreadable",
        explanation: "RFPilot could not read part of Digital Experience Group's response, so it was left out of this comparison.",
        details: ["RFP Example Response 3.pdf: A page could not be extracted with OCR."],
      }]}
    />,
  );

  expect(screen.getByRole("heading", { name: /1 vendor is not in this comparison/ })).toBeInTheDocument();
  expect(screen.getByText(/covers 2 vendors only/)).toBeInTheDocument();
  expect(screen.getByText("Digital Experience Group")).toBeInTheDocument();
  expect(screen.getByText(/part of their file could not be read/)).toBeInTheDocument();
  expect(screen.queryByText(/extracted with OCR/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("announces itself so the exclusion is not missed", () => {
  render(
    <ExcludedVendorsNotice
      comparedCount={1}
      excluded={[{
        responseId: "r",
        vendorLabel: "Vendor",
        reason: "analysis_incomplete",
        explanation: "Not finished.",
        details: [],
      }]}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("1 vendor is not in this comparison");
  expect(screen.getByRole("alert")).toHaveTextContent("their response was still being read");
});
