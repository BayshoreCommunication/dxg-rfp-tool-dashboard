import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RoomDeletionDialog from "./RoomDeletionDialog";

describe("RoomDeletionDialog", () => {
  const props = {
    roomName: "General Session",
    roomPosition: "Room 2 of 4",
    functionCount: 2,
    peakAttendance: "450",
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    props.onCancel.mockClear();
    props.onConfirm.mockClear();
  });

  it("clearly summarizes what room deletion affects", () => {
    render(<RoomDeletionDialog {...props} />);

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Remove “General Session”?");
    expect(screen.getByText("Room 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("scheduled functions")).toBeInTheDocument();
    expect(screen.getByText("450")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("starts focus on the safe action and supports Escape", async () => {
    render(<RoomDeletionDialog {...props} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Keep room" })).toHaveFocus());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses explicit safe and destructive actions", () => {
    render(<RoomDeletionDialog {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Keep room" }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Remove room" }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });
});
