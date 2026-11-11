import { fireEvent, render, screen, within } from "@testing-library/react";
import RoleAccessGuide from "./RoleAccessGuide";
import { ROLE_ACCESS_GROUPS, ROLE_SUMMARIES } from "./roleAccess";

const rowCount = ROLE_ACCESS_GROUPS.reduce((total, group) => total + group.rows.length, 0);

describe("RoleAccessGuide", () => {
  it("names the member's own role with its summary", () => {
    render(<RoleAccessGuide role="planner" />);
    const yours = screen.getByTestId("your-role");
    expect(yours).toHaveTextContent("Your role:");
    expect(yours).toHaveTextContent("Planner");
    expect(yours).toHaveTextContent(ROLE_SUMMARIES.planner);
  });

  it("says nothing about the member's role when it isn't known", () => {
    render(<RoleAccessGuide role={null} />);
    expect(screen.queryByTestId("your-role")).not.toBeInTheDocument();
    expect(screen.queryByText("(you)")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What each role can do" })).toBeInTheDocument();
  });

  it("keeps a one-line summary of all five roles visible outside the collapsed comparison", () => {
    render(<RoleAccessGuide role="viewer" />);
    const summaries = screen.getByTestId("role-summaries");
    expect(summaries.closest("details")).toBeNull();
    for (const [label, role] of [["Owner", "owner"], ["Admin", "organization_admin"], ["Team Manager", "team_manager"], ["Planner", "planner"], ["Viewer", "viewer"]] as const) {
      expect(within(summaries).getByText(label)).toBeInTheDocument();
      expect(within(summaries).getByText(ROLE_SUMMARIES[role])).toBeInTheDocument();
    }
    expect(screen.getByTestId("role-comparison")).not.toHaveAttribute("open");
  });

  it("is a real table: a column header per role, a row header per capability, grouped", () => {
    render(<RoleAccessGuide role="organization_admin" />);
    const table = within(screen.getByTestId("role-table")).getByRole("table", { hidden: true });
    const columns = within(table).getAllByRole("columnheader", { hidden: true }).map((cell) => cell.textContent);
    expect(columns).toEqual(["Capability", "Owner", "Admin(you)", "Team Manager", "Planner", "Viewer"]);
    // Each group is a row group headed by its own header cell.
    const groupHeaders = [...table.querySelectorAll('tbody th[scope="rowgroup"]')].map((cell) => cell.textContent);
    expect(groupHeaders).toEqual(ROLE_ACCESS_GROUPS.map((group) => group.title));
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(rowCount);
    expect(table.querySelectorAll("tbody")).toHaveLength(ROLE_ACCESS_GROUPS.length);
  });

  it("puts words in every cell, so a mark is never the only signal", () => {
    render(<RoleAccessGuide role="owner" />);
    const table = within(screen.getByTestId("role-table")).getByRole("table", { hidden: true });
    const cells = [...table.querySelectorAll("tbody td")];
    expect(cells).toHaveLength(rowCount * 5);
    for (const cell of cells) expect(cell.textContent?.trim()).toMatch(/^(Yes|Limited: \S|No)/);
    // The icons are decoration: the words carry the meaning.
    for (const icon of table.querySelectorAll("svg")) expect(icon).toHaveAttribute("aria-hidden", "true");

    const share = within(table).getByRole("rowheader", { hidden: true, name: /Share a proposal with other members/ }).closest("tr") as HTMLElement;
    const [owner, admin, manager, planner, viewer] = [...share.querySelectorAll("td")].map((cell) => cell.textContent);
    expect(owner).toBe("Yes");
    expect(admin).toBe("Yes");
    expect(manager).toBe("Limited: Their own, and those of teams they manage");
    expect(planner).toBe("Limited: Their own");
    expect(viewer).toBe("No");
  });

  it("shows one role at a time in the stacked layout, starting with the member's own", () => {
    render(<RoleAccessGuide role="viewer" />);
    const stack = screen.getByTestId("role-stack");
    const picker = within(stack).getByLabelText("Show access for", { selector: "select" }) as HTMLSelectElement;
    expect(picker.value).toBe("viewer");
    expect(within(picker).getByRole("option", { hidden: true, name: "Viewer (you)" })).toBeInTheDocument();

    const proposals = within(stack).getByRole("list", { hidden: true, name: "Proposals: Viewer" });
    const create = within(proposals).getByText("Create a proposal: new, a copy, or from a template").closest("li") as HTMLElement;
    expect(create).toHaveTextContent("No");
    expect(within(proposals).getByText("See proposals, in lists and on the dashboard").closest("li")).toHaveTextContent("Limited: Only ones shared with them");

    fireEvent.change(picker, { target: { value: "team_manager" } });
    const managerList = within(stack).getByRole("list", { hidden: true, name: "People: Team Manager" });
    expect(within(managerList).getByText("Invite people").closest("li")).toHaveTextContent(/Limited: Planners and Viewers, into teams they manage/);
    expect(within(stack).getAllByRole("listitem", { hidden: true })).toHaveLength(rowCount);
  });

  it("never says RFP", () => {
    const { container } = render(<RoleAccessGuide role="owner" />);
    expect((container.textContent ?? "").replace(/RFPilot/g, "")).not.toMatch(/\bRFPs?\b/i);
  });
});
