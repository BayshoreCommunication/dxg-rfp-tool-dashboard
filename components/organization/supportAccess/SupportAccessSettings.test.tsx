import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SupportAccessSettings from "./SupportAccessSettings";
import type { SupportGrant, SupportGrantPage } from "./supportGrantModel";

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const mockList = jest.fn();
const mockGet = jest.fn();
const mockCreate = jest.fn();
const mockRevoke = jest.fn();
const mockSearch = jest.fn();
jest.mock("@/app/actions/supportGrants", () => ({
  listSupportGrantsAction: (...args: unknown[]) => mockList(...args),
  getSupportGrantAction: (...args: unknown[]) => mockGet(...args),
  createSupportGrantAction: (...args: unknown[]) => mockCreate(...args),
  revokeSupportGrantAction: (...args: unknown[]) => mockRevoke(...args),
  searchGrantableRfpsAction: (...args: unknown[]) => mockSearch(...args),
}));

const DAY = 24 * 60 * 60_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

const grant = (overrides: Partial<SupportGrant> = {}): SupportGrant => ({
  id: "g-active",
  scope: "rfp",
  rfp: { id: "p1", title: "Spring Sales Kickoff" },
  reason: "Ticket 4821",
  status: "active",
  grantedBy: { id: "u1", name: "Olivia Owner" },
  createdAt: ago(DAY),
  expiresAt: ahead(6 * DAY + 60_000),
  revokedAt: null,
  revokedBy: null,
  activity: { useCount: 3, lastUsedAt: ago(2 * 60 * 60_000) },
  ...overrides,
});

const expired = grant({ id: "g-expired", scope: "organization", rfp: null, reason: null, status: "expired", createdAt: ago(20 * DAY), expiresAt: ago(13 * DAY), activity: { useCount: 0, lastUsedAt: null } });
const revoked = grant({
  id: "g-revoked", rfp: { id: "p2", title: "Autumn Gala" }, reason: null, status: "revoked", createdAt: ago(9 * DAY), expiresAt: ago(2 * DAY),
  revokedAt: ago(5 * DAY), revokedBy: { id: "u2", name: "Adam Admin" }, activity: { useCount: 1, lastUsedAt: ago(6 * DAY) },
});

const pageOf = (grants: SupportGrant[], page = 1, totalPages = 1): SupportGrantPage => ({ grants, page, totalPages, total: grants.length });
const ok = <T,>(data: T) => ({ success: true, message: "OK", status: 200, data });

const renderPage = async (grants: SupportGrant[] = [grant(), expired, revoked], totalPages = 1) => {
  const view = render(<SupportAccessSettings initialPage={pageOf(grants, 1, totalPages)} />);
  await screen.findByRole("heading", { name: "Active access" });
  await waitFor(() => expect(screen.queryByText("No past access yet.") ?? screen.queryByRole("list", { name: "Past access" })).toBeInTheDocument());
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockResolvedValue(ok([
    { id: "p1", title: "Spring Sales Kickoff", ownerName: "Paul Planner" },
    { id: "p2", title: "Autumn Gala", ownerName: null },
  ]));
});

describe("SupportAccessSettings (ORG-405)", () => {
  it("shows active access apart from past access, with who granted it, when it ends and Support's activity", async () => {
    await renderPage();
    const active = within(screen.getByRole("list", { name: "Active access" }));
    expect(active.getByText("Spring Sales Kickoff")).toBeInTheDocument();
    expect(active.getByText("Active")).toBeInTheDocument();
    expect(active.getByText("One RFP")).toBeInTheDocument();
    expect(active.getByText(/Granted by Olivia Owner on/)).toBeInTheDocument();
    expect(active.getByText(/Expires in 6 days/)).toBeInTheDocument();
    expect(active.getByText(/Used 3 times · last used 2 h ago/)).toBeInTheDocument();
    expect(active.getByText("Reason: Ticket 4821")).toBeInTheDocument();
    expect(active.getByRole("button", { name: "Revoke access to Spring Sales Kickoff" })).toBeInTheDocument();

    const past = within(screen.getByRole("list", { name: "Past access" }));
    expect(past.getByText("Whole organization")).toBeInTheDocument();
    expect(past.getByText("Every RFP")).toBeInTheDocument();
    expect(past.getByText(/Expired on/)).toBeInTheDocument();
    expect(past.getByText(/Revoked by Adam Admin on/)).toBeInTheDocument();
    expect(past.getByText("Not used")).toBeInTheDocument();
    // Past access can't be revoked again, but its activity stays readable.
    expect(past.queryByRole("button", { name: /Revoke/ })).not.toBeInTheDocument();
    expect(past.getAllByRole("button", { name: /View activity/ })).toHaveLength(2);
  });

  it("says RFP everywhere and never proposal", async () => {
    const { container } = await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    await screen.findByText("Autumn Gala", { selector: "span" });
    expect(container.textContent).not.toMatch(/proposal/i);
    expect(document.body.textContent).not.toMatch(/proposal/i);
  });

  it("tells an organization with no grants that Support has no access", async () => {
    await renderPage([]);
    expect(screen.getByText("RFPilot Support has no access")).toBeInTheDocument();
    expect(screen.getByText("No past access yet.")).toBeInTheDocument();
  });

  it("stops showing an access as active once its expiry passes, without a reload", async () => {
    jest.useFakeTimers();
    try {
      render(<SupportAccessSettings initialPage={pageOf([grant({ expiresAt: ahead(20_000) })])} />);
      await act(async () => {
        jest.advanceTimersByTime(10);
      });
      expect(within(screen.getByRole("list", { name: "Active access" })).getByText(/Expires in less than a minute/)).toBeInTheDocument();
      await act(async () => {
        jest.advanceTimersByTime(31_000);
      });
      expect(screen.queryByRole("list", { name: "Active access" })).not.toBeInTheDocument();
      expect(within(screen.getByRole("list", { name: "Past access" })).getByText("Expired")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Revoke/ })).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("grants the whole organization for the default seven days", async () => {
    await renderPage([]);
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    fireEvent.click(screen.getByRole("radio", { name: /Whole organization/ }));
    expect(screen.queryByLabelText("RFP")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Access ends after")).toHaveValue("7");
    mockCreate.mockResolvedValue(ok(grant({ id: "g-new", scope: "organization", rfp: null, reason: null, activity: { useCount: 0, lastUsedAt: null } })));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Grant access" }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ proposalId: null, expiresInDays: 7, reason: "" }));
    const active = within(await screen.findByRole("list", { name: "Active access" }));
    expect(active.getByText("Whole organization")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("grants one picked RFP, found by search, with a chosen expiry and a reason", async () => {
    await renderPage([]);
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(await dialog.findByRole("radio", { name: /Spring Sales Kickoff/ })).toBeInTheDocument();
    expect(mockSearch).toHaveBeenCalledWith("");

    // Nothing is sent until an RFP is chosen.
    fireEvent.click(dialog.getByRole("button", { name: "Grant access" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("Choose the RFP that Support may open.");
    expect(mockCreate).not.toHaveBeenCalled();

    // Enter in the search box searches; it never grants the RFP picked earlier.
    fireEvent.click(dialog.getByRole("radio", { name: /Spring Sales Kickoff/ }));
    expect(fireEvent.keyDown(dialog.getByLabelText("RFP"), { key: "Enter" })).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();

    mockSearch.mockResolvedValue(ok([{ id: "p2", title: "Autumn Gala", ownerName: null }]));
    fireEvent.change(dialog.getByLabelText("RFP"), { target: { value: "gala" } });
    await waitFor(() => expect(mockSearch).toHaveBeenLastCalledWith("gala"));
    await waitFor(() => expect(dialog.queryByRole("radio", { name: /Spring Sales Kickoff/ })).not.toBeInTheDocument());
    fireEvent.click(dialog.getByRole("radio", { name: /Autumn Gala/ }));
    fireEvent.change(dialog.getByLabelText("Access ends after"), { target: { value: "14" } });
    fireEvent.change(dialog.getByLabelText("Reason (optional)"), { target: { value: "Ticket 4821" } });

    mockCreate.mockResolvedValue(ok(grant({ id: "g-new", rfp: { id: "p2", title: "Autumn Gala" }, activity: { useCount: 0, lastUsedAt: null } })));
    fireEvent.click(dialog.getByRole("button", { name: "Grant access" }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ proposalId: "p2", expiresInDays: 14, reason: "Ticket 4821" }));
    expect(within(await screen.findByRole("list", { name: "Active access" })).getByText("Autumn Gala")).toBeInTheDocument();
  });

  it("takes a custom expiry of 1 to 30 whole days and refuses anything else before sending", async () => {
    await renderPage([]);
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.click(dialog.getByRole("radio", { name: /Whole organization/ }));
    fireEvent.change(dialog.getByLabelText("Access ends after"), { target: { value: "custom" } });
    const days = dialog.getByLabelText("Days (1 to 30)");

    for (const bad of ["45", "0", "2.5"]) {
      fireEvent.change(days, { target: { value: bad } });
      fireEvent.click(dialog.getByRole("button", { name: "Grant access" }));
      expect(await dialog.findByRole("alert")).toHaveTextContent("Enter a whole number of days from 1 to 30.");
    }
    expect(mockCreate).not.toHaveBeenCalled();

    fireEvent.change(days, { target: { value: "21" } });
    expect(dialog.getByText(/^Access ends [A-Z][a-z]{2} \d/)).toBeInTheDocument();
    mockCreate.mockResolvedValue(ok(grant({ id: "g-new", scope: "organization", rfp: null })));
    fireEvent.click(dialog.getByRole("button", { name: "Grant access" }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ proposalId: null, expiresInDays: 21, reason: "" }));
  });

  it("keeps the dialog open with a human message when the backend refuses the grant", async () => {
    await renderPage([]);
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.click(await dialog.findByRole("radio", { name: /Spring Sales Kickoff/ }));
    // The RFP was deleted, or belongs to another organization: both read as not found.
    mockCreate.mockResolvedValue({ success: false, status: 404, code: "PROPOSAL_NOT_FOUND", message: "RFP not found." });
    fireEvent.click(dialog.getByRole("button", { name: "Grant access" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("That RFP wasn't found. It may have been deleted, so choose another.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("RFPilot Support has no access")).toBeInTheDocument();
  });

  it("revokes an active access after confirmation and moves it to past access", async () => {
    await renderPage([grant()]);
    fireEvent.click(screen.getByRole("button", { name: "Revoke access to Spring Sales Kickoff" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("heading", { name: "Revoke RFPilot Support access?" })).toBeInTheDocument();
    expect(mockRevoke).not.toHaveBeenCalled();
    mockRevoke.mockResolvedValue(ok(grant({ status: "revoked", revokedAt: new Date().toISOString(), revokedBy: { id: "u1", name: "Olivia Owner" } })));
    fireEvent.click(dialog.getByRole("button", { name: "Revoke access" }));
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith("g-active"));
    const past = within(await screen.findByRole("list", { name: "Past access" }));
    expect(past.getByText("Revoked")).toBeInTheDocument();
    expect(past.getByText(/Revoked by Olivia Owner on/)).toBeInTheDocument();
    expect(screen.getByText("RFPilot Support has no access")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains an access that expired before it could be revoked and refreshes the list", async () => {
    await renderPage([grant()]);
    fireEvent.click(screen.getByRole("button", { name: "Revoke access to Spring Sales Kickoff" }));
    mockRevoke.mockResolvedValue({ success: false, status: 409, code: "SUPPORT_GRANT_EXPIRED", message: "This support access has already expired." });
    mockList.mockResolvedValue(ok(pageOf([grant({ status: "expired", expiresAt: ago(1000) })])));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Revoke access" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("This support access has already expired, so there is nothing to revoke.");
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(1));
    expect(dialog.queryByRole("button", { name: "Revoke access" })).not.toBeInTheDocument();
    fireEvent.click(dialog.getByText("Close", { selector: "button" }));
    expect(within(screen.getByRole("list", { name: "Past access" })).getByText("Expired")).toBeInTheDocument();
  });

  it("shows what Support did under a grant, as RFPilot Support and never a staff name", async () => {
    await renderPage();
    mockGet.mockResolvedValue(ok({
      ...revoked,
      events: [
        { at: ago(6 * DAY), agentReference: "00AB12", operation: "rfp.read", rfp: { id: "p2", title: "Autumn Gala" } },
        { at: ago(6 * DAY + 1000), agentReference: "00AB12", operation: "vendor_responses.list", rfp: { id: "p2", title: "Autumn Gala" } },
        { at: ago(6 * DAY + 2000), agentReference: null, operation: "brand.new.operation", rfp: null },
      ],
    }));
    fireEvent.click(screen.getByRole("button", { name: "View activity for Autumn Gala" }));
    const dialog = within(screen.getByRole("dialog"));
    const events = within(await dialog.findByRole("list", { name: "Support activity" })).getAllByRole("listitem");
    expect(mockGet).toHaveBeenCalledWith("g-revoked");
    expect(events).toHaveLength(3);
    expect(events[0]).toHaveTextContent("Opened an RFP");
    expect(events[0]).toHaveTextContent("Autumn Gala");
    expect(events[0]).toHaveTextContent("RFPilot Support (agent 00AB12)");
    expect(events[1]).toHaveTextContent("Viewed an RFP's vendor responses");
    expect(events[2]).toHaveTextContent("Read RFP data");
    expect(events[2]).not.toHaveTextContent("brand.new.operation");
  });

  it("says so when Support never used a grant, and when the grant is no longer there", async () => {
    await renderPage();
    mockGet.mockResolvedValue(ok({ ...expired, events: [] }));
    fireEvent.click(screen.getByRole("button", { name: "View activity for Whole organization" }));
    expect(await screen.findByText("RFPilot Support hasn't used this access.")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByText("Close", { selector: "button" }));

    // Another organization's grant, or one that is gone, is a 404: say so and refresh.
    mockGet.mockResolvedValue({ success: false, status: 404, code: "SUPPORT_GRANT_NOT_FOUND", message: "Support access grant not found." });
    mockList.mockResolvedValue(ok(pageOf([])));
    fireEvent.click(screen.getByRole("button", { name: "View activity for Autumn Gala" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That support access wasn't found. Reload the page.");
    fireEvent.click(within(screen.getByRole("dialog")).getByText("Close", { selector: "button" }));
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(1));
    expect(await screen.findByText("No past access yet.")).toBeInTheDocument();
  });

  it("fetches older pages by itself while they could still hold live access", async () => {
    // Page 1 ends with a grant made yesterday, so page 2 may hold access that hasn't run out.
    const older = grant({ id: "g-older", rfp: { id: "p2", title: "Autumn Gala" }, createdAt: ago(3 * DAY), expiresAt: ahead(4 * DAY) });
    mockList.mockResolvedValue(ok(pageOf([older, expired, grant()], 2, 2)));
    render(<SupportAccessSettings initialPage={pageOf([grant()], 1, 2)} />);
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(2));
    const active = within(await screen.findByRole("list", { name: "Active access" }));
    expect(await active.findByText("Autumn Gala")).toBeInTheDocument();
    // The repeated row is not listed twice, and there is nothing older left.
    expect(active.getAllByRole("listitem")).toHaveLength(2);
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Show older access" })).not.toBeInTheDocument();
  });

  it("offers access older than 30 days a page at a time", async () => {
    // Nothing older than the oldest row here can still be live, so the rest waits for a click.
    await renderPage([grant(), grant({ id: "g-old", status: "expired", createdAt: ago(40 * DAY), expiresAt: ago(33 * DAY) })], 2);
    expect(mockList).not.toHaveBeenCalled();
    mockList.mockResolvedValue(ok(pageOf([grant({ id: "g-older", scope: "organization", rfp: null, status: "expired", createdAt: ago(60 * DAY), expiresAt: ago(53 * DAY) })], 2, 2)));
    fireEvent.click(screen.getByRole("button", { name: "Show older access" }));
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(2));
    expect(await within(screen.getByRole("list", { name: "Past access" })).findByText("Whole organization")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show older access" })).not.toBeInTheDocument();
  });

  it("judges expiry by the server's clock, so a device clock that runs ahead can't hide live access", async () => {
    // The device believes it is 10 days later than the server does.
    render(<SupportAccessSettings initialPage={pageOf([grant()])} serverNow={Date.now() - 10 * DAY} />);
    const active = within(await screen.findByRole("list", { name: "Active access" }));
    expect(active.getByRole("button", { name: "Revoke access to Spring Sales Kickoff" })).toBeInTheDocument();
    expect(screen.queryByText("RFPilot Support has no access")).not.toBeInTheDocument();
  });

  it("shows a load failure with a way to try again", async () => {
    render(<SupportAccessSettings initialPage={null} initialError="Support access couldn't be loaded. Try again." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Support access couldn't be loaded. Try again.");
    expect(screen.queryByRole("button", { name: "Grant access" })).not.toBeInTheDocument();
    mockList.mockResolvedValue(ok(pageOf([grant()])));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("list", { name: "Active access" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
