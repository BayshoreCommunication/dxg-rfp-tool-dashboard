import { render, screen, within } from "@testing-library/react";
import TopCardItem from "./TopCardItem";
import type { DashboardStats } from "./dashboardStats";
import { RFP_NOUN } from "@/test/wording";

const stats: DashboardStats = {
  totalProposals: 42,
  totalEmailSent: 15,
  totalEmailClicked: 7,
  totalProposalViews: 100,
  totalVendorResponses: 9,
  unreadVendorResponses: 3,
  vendorResponsesLocked: false,
};

const unavailable: DashboardStats = {
  totalProposals: null,
  totalEmailSent: null,
  totalEmailClicked: null,
  totalProposalViews: null,
  totalVendorResponses: null,
  unreadVendorResponses: null,
  vendorResponsesLocked: false,
};

describe("TopCardItem", () => {
  it("renders all five stat card titles", () => {
    render(<TopCardItem stats={stats} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Total Proposals",
      "Total Email Sent",
      "Total Email Clicked",
      "Total Proposal Views",
      "Vendor Responses",
    ]);
  });

  it("renders the values it was given", () => {
    render(<TopCardItem stats={stats} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("3 unread")).toBeInTheDocument();
  });

  it("formats large numbers like the rest of the page", () => {
    render(<TopCardItem stats={{ ...stats, totalProposalViews: 1234567, unreadVendorResponses: 1200, totalVendorResponses: 4321 }} />);
    expect(screen.getByTestId("stat-card-views-value")).toHaveTextContent("1,234,567");
    expect(screen.getByTestId("stat-card-vendor-responses-value")).toHaveTextContent("4,321");
    expect(screen.getByTestId("stat-card-vendor-responses-badge")).toHaveTextContent("1,200 unread");
  });

  it("shows real zeros as zeros", () => {
    render(<TopCardItem stats={{ ...stats, totalProposals: 0, totalEmailSent: 0, totalEmailClicked: 0, totalProposalViews: 0, totalVendorResponses: 0, unreadVendorResponses: 0 }} />);
    expect(screen.getAllByText("0")).toHaveLength(5);
    expect(screen.getByText("0 unread")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-stat-cards-unavailable")).not.toBeInTheDocument();
  });

  it("says the totals are the member's own, in a visible caption", () => {
    render(<TopCardItem stats={stats} />);
    const row = screen.getByRole("region", { name: "Your totals" });
    expect(within(row).getByRole("heading", { level: 2, name: "Your totals" })).toBeInTheDocument();
    expect(within(row).getByTestId("dashboard-stat-cards-caption")).toHaveTextContent(
      "Counts for the proposals you own. The view and filters below don't change them.",
    );
  });

  it("never makes up a zero for a total that could not be loaded", () => {
    render(<TopCardItem stats={unavailable} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
    for (const id of ["proposals", "sent", "clicked", "views", "vendor-responses"]) {
      expect(screen.getByTestId(`stat-card-${id}-value`)).toHaveTextContent("—");
    }
    expect(screen.getByTestId("dashboard-stat-cards-unavailable")).toHaveTextContent("We couldn't load your totals. Reload the page to try again.");
    // Still five links, each saying its number is missing.
    expect(screen.getByRole("link", { name: "Your Total Proposals: unavailable. Open proposals" })).toHaveAttribute("href", "/proposals");
    expect(screen.getByRole("link", { name: "Your Vendor Responses: unavailable. Open responses" })).toHaveAttribute("href", "/vendor-responses");
  });

  it("keeps the totals that did load when only some failed", () => {
    render(<TopCardItem stats={{ ...stats, totalVendorResponses: null, unreadVendorResponses: null }} />);
    expect(screen.getByTestId("stat-card-proposals-value")).toHaveTextContent("42");
    expect(screen.getByTestId("stat-card-vendor-responses-value")).toHaveTextContent("—");
    expect(screen.getByTestId("dashboard-stat-cards-unavailable")).toHaveTextContent("We couldn't load some of your totals.");
  });

  it("a plan without vendor responses says so instead of asking for a reload", () => {
    render(<TopCardItem stats={{ ...stats, totalVendorResponses: null, unreadVendorResponses: null, vendorResponsesLocked: true }} />);
    expect(screen.getByTestId("stat-card-vendor-responses-value")).toHaveTextContent("—");
    expect(screen.getByTestId("stat-card-vendor-responses-badge")).toHaveTextContent("Not in your plan");
    expect(screen.getByRole("link", { name: "Your Vendor Responses: not counted, Not in your plan. Open responses" })).toHaveAttribute("href", "/vendor-responses");
    expect(screen.queryByTestId("dashboard-stat-cards-unavailable")).not.toBeInTheDocument();
  });

  it("shows no invented trend badges", () => {
    // The tiles once carried hard-coded "+18%", "+5%" pills with no period or basis behind them.
    render(<TopCardItem stats={stats} />);
    expect(screen.queryByText(/^\+\d+%$/)).not.toBeInTheDocument();
  });

  it("makes every metric card a navigation link named for the member's own total", () => {
    render(<TopCardItem stats={stats} />);

    expect(screen.getByRole("link", { name: "Your Total Proposals: 42. Open proposals" })).toHaveAttribute("href", "/proposals");
    expect(screen.getByRole("link", { name: "Your Total Email Sent: 15. Open email activity" })).toHaveAttribute("href", "/email");
    expect(screen.getByRole("link", { name: "Your Total Email Clicked: 7. Open email activity" })).toHaveAttribute("href", "/email");
    expect(screen.getByRole("link", { name: "Your Total Proposal Views: 100. Review proposals" })).toHaveAttribute("href", "/proposals");
    expect(screen.getByRole("link", { name: "Your Vendor Responses: 9, 3 unread. Open responses" })).toHaveAttribute("href", "/vendor-responses");
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("gives every card link the dashboard's keyboard focus ring, not a white one", () => {
    render(<TopCardItem stats={stats} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(link).toHaveClass("focus-visible:outline-none", "focus-visible:ring-2", "focus-visible:ring-sky-500", "focus-visible:ring-offset-2");
      // The old ring: white, with an offset the dark theme paints dark, so it vanished on the light page.
      expect(link.className).not.toMatch(/focus-visible:ring-white|focus-visible:ring-offset-slate-200|focus-visible:ring-4/);
    }
  });

  it("says proposal, never RFP as a noun, in text and accessible names", () => {
    render(<TopCardItem stats={stats} />);
    expect(document.body.textContent ?? "").not.toMatch(RFP_NOUN);
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("aria-label") ?? "").not.toMatch(RFP_NOUN);
  });
});
