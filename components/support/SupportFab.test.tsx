import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SupportFab from "./SupportFab";

let pathname = "/dashboard";
const push = jest.fn();
const getSupportUnreadCountAction = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));
jest.mock("@/app/actions/supportDesk", () => ({
  getSupportUnreadCountAction: () => getSupportUnreadCountAction(),
}));

// jsdom's PointerEvent does not carry clientX/Y, so synthesize MouseEvents
// on the pointer event names; React reads the coordinates off the native event.
const pointer = (type: string, element: Element, x: number, y: number) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  fireEvent(element, event);
};
const press = (element: Element, x: number, y: number) => pointer("pointerdown", element, x, y);
const move = (element: Element, x: number, y: number) => pointer("pointermove", element, x, y);
const release = (element: Element, x: number, y: number) => pointer("pointerup", element, x, y);

describe("SupportFab", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    push.mockReset();
    getSupportUnreadCountAction.mockReset();
    getSupportUnreadCountAction.mockResolvedValue(0);
    window.localStorage.clear();
  });

  test("a tap opens a new request", () => {
    render(<SupportFab />);
    const fab = screen.getByTestId("support-fab");
    expect(fab).toHaveTextContent("Need support?");
    press(fab, 100, 100);
    release(fab, 101, 100);
    expect(push).toHaveBeenCalledWith("/support?new=1");
  });

  test("a drag moves it, remembers the spot, and does not open Support", () => {
    render(<SupportFab />);
    const fab = screen.getByTestId("support-fab");
    press(fab, 100, 100);
    move(fab, 160, 40);
    expect(fab).toHaveAttribute("data-dragging", "true");
    release(fab, 160, 40);
    expect(push).not.toHaveBeenCalled();
    expect(fab).not.toHaveAttribute("data-dragging");
    expect(fab.style.left).not.toBe("");
    expect(JSON.parse(window.localStorage.getItem("rfpilot.support-fab.position") || "null")).toEqual(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );
  });

  test("turns into an unread indicator when RFPilot has replied", async () => {
    getSupportUnreadCountAction.mockResolvedValue(2);
    render(<SupportFab />);
    await waitFor(() => expect(screen.getByTestId("support-fab")).toHaveTextContent("RFPilot replied"));
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId("support-fab"), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/support");
  });

  test("stays out of the way on the Support pages", () => {
    pathname = "/support/abc";
    render(<SupportFab />);
    expect(screen.queryByTestId("support-fab")).not.toBeInTheDocument();
    expect(getSupportUnreadCountAction).not.toHaveBeenCalled();
  });
});
