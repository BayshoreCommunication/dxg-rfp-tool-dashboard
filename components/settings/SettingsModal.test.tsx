import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { SettingsAccessProvider } from "./SettingsAccessContext";
import SettingsModal, { KEEP_CLOSED_SECTIONS_MS, SettingsDialogOpener } from "./SettingsModal";
import { useInSettingsModal } from "./SettingsModalContext";
import { settingsAccessForRoles } from "./settingsAccess";

const back = jest.fn();
const replace = jest.fn();
let mockPathname = "/settings/teams";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ back, replace }),
}));

// Each section is replaced by a probe that counts its mounts: a mount is a fresh data load.
const mockMounts: Record<string, number> = {};
function mockProbe(name: string) {
  return function Probe() {
    const inModal = useInSettingsModal();
    useEffect(() => {
      mockMounts[name] = (mockMounts[name] ?? 0) + 1;
    }, []);
    return (
      <div>
        <p>{`${name} section${inModal ? " in dialog" : ""}`}</p>
        <input aria-label={`${name} field`} />
        <button type="button">{`${name} action`}</button>
      </div>
    );
  };
}
jest.mock("./SettingsDetials", () => ({ __esModule: true, default: mockProbe("General") }));
jest.mock("@/components/organization/members/UsersSettings", () => ({ __esModule: true, default: mockProbe("Users") }));
jest.mock("@/components/organization/teams/TeamsSettings", () => ({ __esModule: true, default: mockProbe("Teams") }));
jest.mock("@/components/organization/security/SecuritySettings", () => ({ __esModule: true, default: mockProbe("Security") }));
jest.mock("@/components/organization/vendors/VendorListSettings", () => ({ __esModule: true, default: mockProbe("Vendors") }));
jest.mock("@/components/organization/templates/TemplateListSettings", () => ({ __esModule: true, default: mockProbe("Templates") }));

// The host wraps the app; the opener stands in for the intercepted settings route.
function Harness({ role = "planner", open = true }: { role?: string; open?: boolean }) {
  return (
    <SettingsAccessProvider value={settingsAccessForRoles([role])}>
      <SettingsModal>
        <p>page underneath</p>
        {open && <SettingsDialogOpener />}
      </SettingsModal>
    </SettingsAccessProvider>
  );
}

const hrefOf = (name: string) => (name === "General" ? "/settings" : `/settings/${name.toLowerCase()}`);
const navLink = (name: string) =>
  document.querySelector(`nav[aria-label="Settings sections"] a[href="${hrefOf(name)}"]`) as HTMLElement;
const settingsDialog = () => document.querySelector('[role="dialog"][aria-label="Settings"]') as HTMLElement | null;

describe("SettingsModal", () => {
  beforeEach(() => {
    back.mockClear();
    mockPathname = "/settings/teams";
    for (const key of Object.keys(mockMounts)) delete mockMounts[key];
    replace.mockClear();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders nothing over the page until a settings route opens it", () => {
    render(<Harness open={false} />);
    expect(screen.getByText("page underneath")).toBeInTheDocument();
    expect(settingsDialog()).toBeNull();
  });

  test("groups the sections, marks the current one and renders only that section", async () => {
    render(<Harness />);

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(nav).toHaveTextContent("Organization");
    expect(nav).toHaveTextContent("Proposals");
    expect(navLink("Teams")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
    expect(await screen.findByText("Teams section in dialog")).toBeInTheDocument();
    expect(screen.queryByText(/Users section/)).not.toBeInTheDocument();
  });

  test("a Viewer sees neither Vendors nor Templates, from the first render", () => {
    render(<Harness role="viewer" />);
    expect(navLink("Security")).toBeInTheDocument();
    expect(navLink("Vendors")).toBeNull();
    expect(navLink("Templates")).toBeNull();
  });

  test("switching section shows it at once without navigating, and keeps visited sections loaded", async () => {
    render(<Harness />);
    await screen.findByText("Teams section in dialog");

    fireEvent.click(navLink("Users"));
    expect(replace).not.toHaveBeenCalled();
    expect(navLink("Users")).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("Users section in dialog")).toBeVisible();
    expect(screen.getByText("Teams section in dialog")).not.toBeVisible();

    fireEvent.click(navLink("Teams"));
    fireEvent.click(navLink("Users"));
    // Back and forth: each section loaded once.
    expect(mockMounts).toEqual({ Teams: 1, Users: 1 });
  });

  test("hovering a section starts loading it before the click", async () => {
    render(<Harness />);
    fireEvent.mouseEnter(navLink("Vendors"));
    expect(await screen.findByText("Vendors section in dialog")).not.toBeVisible();

    fireEvent.click(navLink("Vendors"));
    expect(screen.getByText("Vendors section in dialog")).toBeVisible();
    expect(mockMounts.Vendors).toBe(1);
  });

  test("a modified click is left to the browser", () => {
    render(<Harness />);
    fireEvent.click(navLink("Users"), { metaKey: true });
    expect(navLink("Teams")).toHaveAttribute("aria-current", "page");
  });

  test("follows a link inside a section to another section, but not the page underneath on close", () => {
    const view = render(<Harness />);

    mockPathname = "/settings/security";
    view.rerender(<Harness />);
    expect(navLink("Security")).toHaveAttribute("aria-current", "page");

    mockPathname = "/dashboard";
    view.rerender(<Harness />);
    expect(navLink("Security")).toHaveAttribute("aria-current", "page");
  });

  test("closes back to the page underneath with the button or Escape", () => {
    render(<Harness />);
    fireEvent.click(screen.getAllByRole("button", { name: "Close settings" })[1]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(back).toHaveBeenCalledTimes(2);
  });

  test("Escape closes a dialog opened from a section first, not the settings dialog", () => {
    render(<Harness />);
    const inner = document.createElement("div");
    inner.setAttribute("role", "dialog");
    inner.setAttribute("aria-modal", "true");
    document.body.appendChild(inner);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(back).not.toHaveBeenCalled();
    inner.remove();
  });

  test("reopening shows the sections already loaded, without loading them again", async () => {
    const view = render(<Harness />);
    await screen.findByText("Teams section in dialog");
    fireEvent.click(navLink("Users"));
    await screen.findByText("Users section in dialog");

    // Closed: hidden, not unmounted, and no longer modal.
    mockPathname = "/dashboard";
    view.rerender(<Harness open={false} />);
    expect(settingsDialog()).not.toBeVisible();
    expect(document.body.style.overflow).not.toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(back).not.toHaveBeenCalled();

    mockPathname = "/settings/users";
    view.rerender(<Harness />);
    expect(settingsDialog()).toBeVisible();
    expect(screen.getByText("Users section in dialog")).toBeVisible();
    expect(mockMounts).toEqual({ Teams: 1, Users: 1 });
  });

  test("a section the member interacted with starts fresh on reopen; the others are kept", async () => {
    const view = render(<Harness />);
    await screen.findByText("Teams section in dialog");
    fireEvent.mouseEnter(navLink("Security"));
    await screen.findByText("Security section in dialog");
    fireEvent.mouseEnter(navLink("General"));
    await screen.findByText("General section in dialog");

    fireEvent.input(screen.getByLabelText("Teams field"), { target: { value: "unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "Security action", hidden: true }));
    // Clicking text, not a control, is only reading.
    fireEvent.click(screen.getByText("General section in dialog"));

    mockPathname = "/dashboard";
    view.rerender(<Harness open={false} />);
    mockPathname = "/settings/teams";
    view.rerender(<Harness />);

    expect(await screen.findByLabelText("Teams field")).toHaveValue("");
    expect(mockMounts).toEqual({ Teams: 2, Security: 1, General: 1 });
    expect(screen.queryByText("Security section in dialog")).not.toBeInTheDocument();
  });

  test(`reopening after ${KEEP_CLOSED_SECTIONS_MS / 60_000} minutes loads every section fresh`, async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    const view = render(<Harness />);
    await screen.findByText("Teams section in dialog");

    mockPathname = "/dashboard";
    view.rerender(<Harness open={false} />);
    now.mockReturnValue(1_000_000 + KEEP_CLOSED_SECTIONS_MS + 1);
    mockPathname = "/settings/teams";
    act(() => view.rerender(<Harness />));

    await screen.findByText("Teams section in dialog");
    expect(mockMounts.Teams).toBe(2);
  });
});
