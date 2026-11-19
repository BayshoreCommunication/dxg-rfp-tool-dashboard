import { render, screen, within } from "@testing-library/react";

import { RailDetails, RailSources, RailSummary, sourceStatus } from "./AssistantRail";

describe("RailSummary", () => {
  const props = { title: "Ready to help", detail: "Ask me anything.", working: false, documents: 2, details: 5, questions: "3/9" };

  test("shows the status, the three counts and the privacy note", () => {
    render(<RailSummary {...props} />);
    expect(screen.getByRole("heading", { name: "Ready to help" })).toBeInTheDocument();
    expect(screen.getByText("AI workspace")).toBeInTheDocument();
    const documents = screen.getByText("Documents").parentElement as HTMLElement;
    expect(within(documents).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByText("Details captured").parentElement as HTMLElement).getByText("5")).toBeInTheDocument();
    expect(within(screen.getByText("Questions completed").parentElement as HTMLElement).getByText("3/9")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Your files and answers stay private to this proposal");
  });

  test("says when the AI is working", () => {
    render(<RailSummary {...props} working />);
    expect(screen.getByRole("status")).toHaveTextContent("AI is actively working");
  });
});

describe("RailDetails", () => {
  test("lists the captured details read-only and links to the editor", () => {
    render(<RailDetails rows={[{ label: "Event", value: "Northstar Summit" }, { label: "Venue", value: "Hall A" }]} editHref="/proposals/proposal-edit?proposalId=abc" />);
    const list = screen.getByRole("heading", { name: "Proposal details" }).closest("section") as HTMLElement;
    expect(within(list).getByText("Northstar Summit")).toBeInTheDocument();
    expect(within(list).getByText("Hall A")).toBeInTheDocument();
    expect(within(list).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(list).getByRole("link", { name: /Edit all details/ })).toHaveAttribute("href", "/proposals/proposal-edit?proposalId=abc");
    expect(within(list).getByText(/read-only summary/i)).toBeInTheDocument();
  });

  test("explains the empty state and offers no edit link", () => {
    render(<RailDetails rows={[]} editHref="/proposals/proposal-edit?proposalId=abc" />);
    expect(screen.getByText(/Details appear here/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("RailSources", () => {
  test("renders nothing without sources", () => {
    const { container } = render(<RailSources sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("names each document and its state in words", () => {
    render(
      <RailSources
        sources={[
          { id: "1", name: "venue.pdf", status: "ready" },
          { id: "2", name: "scan.pdf", status: "scanning" },
          { id: "3", name: "bad.pdf", status: "quarantined" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Ready")).toBeInTheDocument();
    expect(within(items[1]).getByText("Checking")).toBeInTheDocument();
    expect(within(items[2]).getByText("Needs attention")).toBeInTheDocument();
  });

  test("sourceStatus maps ready, failure-like and in-progress statuses", () => {
    expect(sourceStatus("ready")).toEqual({ label: "Ready", tone: "success" });
    for (const status of ["failed", "blocked", "rejected", "infected", "error"]) {
      expect(sourceStatus(status).tone).toBe("danger");
    }
    expect(sourceStatus("pending_upload").tone).toBe("info");
  });
});

test("the rail components use semantic tokens only", () => {
  const { container } = render(
    <>
      <RailSummary title="t" detail="d" working documents={0} details={0} questions="—" />
      <RailDetails rows={[{ label: "a", value: "b" }]} editHref="/x" />
      <RailSources sources={[{ id: "1", name: "n", status: "ready" }]} />
    </>,
  );
  const classes = Array.from(container.querySelectorAll("[class]")).map((el) => el.getAttribute("class") ?? "").join(" ");
  expect(classes).not.toMatch(/\[#[0-9a-f]{3,8}\]/i);
});
