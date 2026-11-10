import { render, screen } from "@testing-library/react";
import SettingsSupportAccessPage from "./page";

const mockList = jest.fn();
jest.mock("@/app/actions/supportGrants", () => ({
  listSupportGrantsAction: (...args: unknown[]) => mockList(...args),
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
jest.mock("@/components/organization/supportAccess/SupportAccessSettings", () => ({
  __esModule: true,
  default: ({ initialPage, initialError }: { initialPage: { grants: unknown[] } | null; initialError: string | null }) => (
    <div data-testid="support-access">{initialPage ? `${initialPage.grants.length} grants` : initialError}</div>
  ),
}));

// ORG-405: the page exists for an Owner or Admin only.
describe("/settings/support-access", () => {
  beforeEach(() => mockList.mockReset());

  it("does not exist for a Team Manager, Planner or Viewer (the backend's plain 403)", async () => {
    mockList.mockResolvedValue({ success: false, status: 403, message: "Forbidden" });
    await expect(SettingsSupportAccessPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the first page of grants for an Owner or Admin", async () => {
    mockList.mockResolvedValue({ success: true, status: 200, message: "OK", data: { grants: [], page: 1, totalPages: 1, total: 0 } });
    render(await SettingsSupportAccessPage());
    expect(mockList).toHaveBeenCalledWith(1);
    expect(screen.getByTestId("support-access")).toHaveTextContent("0 grants");
  });

  it("shows a readable error, not a 404, when the list can't be loaded", async () => {
    mockList.mockResolvedValue({ success: false, status: 500, code: "SUPPORT_ACCESS_INTERNAL_ERROR", message: "The support access request could not be completed." });
    render(await SettingsSupportAccessPage());
    expect(screen.getByTestId("support-access")).toHaveTextContent("The request couldn't be completed. Try again.");
  });
});
