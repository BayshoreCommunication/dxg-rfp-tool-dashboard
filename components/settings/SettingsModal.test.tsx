import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { SettingsAccessProvider } from "./SettingsAccessContext";
import SettingsModal from "./SettingsModal";
import { useInSettingsModal } from "./SettingsModalContext";
import { settingsAccessForRoles } from "./settingsAccess";

const back = jest.fn();
let mockPathname = "/settings/teams";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ back }),
}));

// Each section is replaced by a probe that counts its mockMounts: a mount is a fresh data load.
const mockMounts: Record<string, number> = {};
function mockProbe(name: string) {
  return function Probe() {
    const inModal = useInSettingsModal();
    useEffect(() => {
      mockMounts[name] = (mockMounts[name] ?? 0) + 1;
    }, []);
    return <p>{`${name} section${inModal ? " in dialog" : ""}`}</p>;
  };
}
jest.mock("./SettingsDetials", () => ({ __esModule: true, default: mockProbe("General") }));
jest.mock("@/components/organization/members/UsersSettings", () => ({ __esModule: true, default: mockProbe("Users") }));
jest.mock("@/components/organization/teams/TeamsSettings", () => ({ __esModule: true, default: mockProbe("Teams") }));
jest.mock("@/components/organization/security/SecuritySettings", () => ({ __esModule: true, default: mockProbe("Security") }));
jest.mock("@/components/organization/vendors/VendorListSettings", () => ({ __esModule: true, default: mockProbe("Vendors") }));
jest.mock("@/components/organization/templates/TemplateListSettings", () => ({ __esModule: true, default: mockProbe("Templates") }));

const renderAs = (role: string) =>
  render(
    <SettingsAccessProvider value={settingsAccessForRoles([role])}>
      <SettingsModal />
    </SettingsAccessProvider>,
  );

const navLink = (name: string) =>
  screen.getByRole("navigation", { name: "Settings sections" }).querySelector(`a[href="${hrefOf(name)}"]`) as HTMLElement;
const hrefOf = (name: string) => (name === "General" ? "/settings" : `/settings/${name.toLowerCase()}`);

describe("SettingsModal", () => {
  let replaceState: jest.SpyInstance;

  beforeEach(() => {
    back.mockClear();
    mockPathname = "/settings/teams";
    for (const key of Object.keys(mockMounts)) delete mockMounts[key];
    replaceState = jest.spyOn(window.history, "replaceState").mockImplementation(() => undefined);
  });
  afterEach(() => replaceState.mockRestore());

  test("groups the sections, marks the current one and renders only that section", () => {
    renderAs("planner");

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(nav).toHaveTextContent("Organization");
    expect(nav).toHaveTextContent("Proposals");
    expect(navLink("Teams")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
    expect(screen.getByText("Teams section in dialog")).toBeInTheDocument();
    expect(screen.queryByText(/Users section/)).not.toBeInTheDocument();
  });

  test("a Viewer sees neither Vendors nor Templates, from the first render", () => {
    renderAs("viewer");
    expect(navLink("Security")).toBeInTheDocument();
    expect(navLink("Vendors")).toBeNull();
    expect(navLink("Templates")).toBeNull();
  });

  test("switching section rewrites the address without navigating and keeps visited sections loaded", () => {
    renderAs("planner");

    fireEvent.click(navLink("Users"));
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/settings/users");
    expect(navLink("Users")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Users section in dialog")).toBeVisible();
    expect(screen.getByText("Teams section in dialog")).not.toBeVisible();

    fireEvent.click(navLink("Teams"));
    fireEvent.click(navLink("Users"));
    // Back and forth: each section loaded once.
    expect(mockMounts).toEqual({ Teams: 1, Users: 1 });
  });

  test("hovering a section starts loading it before the click", () => {
    renderAs("planner");
    fireEvent.mouseEnter(navLink("Vendors"));
    expect(mockMounts.Vendors).toBe(1);
    expect(screen.getByText("Vendors section in dialog")).not.toBeVisible();

    fireEvent.click(navLink("Vendors"));
    expect(screen.getByText("Vendors section in dialog")).toBeVisible();
    expect(mockMounts.Vendors).toBe(1);
  });

  test("a modified click is left to the browser", () => {
    renderAs("planner");
    fireEvent.click(navLink("Users"), { metaKey: true });
    expect(replaceState).not.toHaveBeenCalled();
    expect(navLink("Teams")).toHaveAttribute("aria-current", "page");
  });

  test("follows a link inside a section to another section, but not the page underneath on close", () => {
    const view = renderAs("planner");
    const rerender = () =>
      view.rerender(
        <SettingsAccessProvider value={settingsAccessForRoles(["planner"])}>
          <SettingsModal />
        </SettingsAccessProvider>,
      );

    mockPathname = "/settings/security";
    rerender();
    expect(navLink("Security")).toHaveAttribute("aria-current", "page");

    mockPathname = "/dashboard";
    rerender();
    expect(navLink("Security")).toHaveAttribute("aria-current", "page");
  });

  test("closes back to the page underneath with the button or Escape", () => {
    renderAs("planner");
    fireEvent.click(screen.getAllByRole("button", { name: "Close settings" })[1]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(back).toHaveBeenCalledTimes(2);
  });

  test("Escape closes a dialog opened from a section first, not the settings dialog", () => {
    renderAs("planner");
    const inner = document.createElement("div");
    inner.setAttribute("role", "dialog");
    inner.setAttribute("aria-modal", "true");
    document.body.appendChild(inner);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(back).not.toHaveBeenCalled();
    inner.remove();
  });
});
