import { fireEvent, render, screen } from "@testing-library/react";
import SettingsModal from "./SettingsModal";
import { useInSettingsModal } from "./SettingsModalContext";

const back = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/settings/teams",
  useRouter: () => ({ back }),
}));
jest.mock("@/app/actions/vendorList", () => ({
  getVendorListAccessAction: jest.fn().mockResolvedValue({ canRead: false }),
}));
jest.mock("@/app/actions/proposalTemplates", () => ({
  getTemplateAccessAction: jest.fn().mockResolvedValue({ canUse: true }),
}));

function Probe() {
  return <p>{useInSettingsModal() ? "inside modal" : "outside"}</p>;
}

describe("SettingsModal", () => {
  beforeEach(() => back.mockClear());

  test("lists sections on the left, marks the current one and tells the page it is in a modal", async () => {
    render(
      <SettingsModal>
        <Probe />
      </SettingsModal>,
    );

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(nav).toHaveTextContent("General");
    expect(screen.getAllByRole("link", { name: "Teams" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("inside modal")).toBeInTheDocument();
    // Templates is allowed, Vendors is not: the list follows the same gating as the tab strip.
    expect((await screen.findAllByRole("link", { name: "Templates" })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Vendors" })).not.toBeInTheDocument();
  });

  test("closes back to the page underneath with the button or Escape", () => {
    render(
      <SettingsModal>
        <Probe />
      </SettingsModal>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Close settings" })[1]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(back).toHaveBeenCalledTimes(2);
  });
});
