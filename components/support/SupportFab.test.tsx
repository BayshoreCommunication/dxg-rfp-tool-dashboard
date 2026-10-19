import { render, screen, waitFor } from "@testing-library/react";
import SupportFab from "./SupportFab";

let pathname = "/dashboard";
const getSupportUnreadCountAction = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));
jest.mock("@/app/actions/supportDesk", () => ({
  getSupportUnreadCountAction: () => getSupportUnreadCountAction(),
}));

describe("SupportFab", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    getSupportUnreadCountAction.mockReset();
    getSupportUnreadCountAction.mockResolvedValue(0);
  });

  test("offers a new request from any page", () => {
    render(<SupportFab />);
    const link = screen.getByTestId("support-fab");
    expect(link).toHaveAttribute("href", "/support?new=1");
    expect(link).toHaveTextContent("Need support?");
  });

  test("turns into an unread indicator when DXG has replied", async () => {
    getSupportUnreadCountAction.mockResolvedValue(2);
    render(<SupportFab />);
    await waitFor(() => expect(screen.getByTestId("support-fab")).toHaveTextContent("DXG replied"));
    expect(screen.getByTestId("support-fab")).toHaveAttribute("href", "/support");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("stays out of the way on the Support pages", () => {
    pathname = "/support/abc";
    render(<SupportFab />);
    expect(screen.queryByTestId("support-fab")).not.toBeInTheDocument();
    expect(getSupportUnreadCountAction).not.toHaveBeenCalled();
  });
});
