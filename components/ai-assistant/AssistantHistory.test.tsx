import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssistantHistory from "./AssistantHistory";
import type { AssistantThread } from "@/lib/aiAssistant/types";

const active: AssistantThread = {
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e6f",
  title: "Active planning",
  status: "active",
  messageCount: 4,
  lastMessageAt: "2026-07-29T00:00:00.000Z",
  deletedAt: null,
  purgeAfter: null,
  recoverable: false,
  createdAt: "2026-07-28T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

const deleted: AssistantThread = {
  ...active,
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e70",
  title: "Deleted planning",
  status: "archived",
  deletedAt: "2026-07-29T00:00:00.000Z",
  purgeAfter: "2026-08-28T00:00:00.000Z",
  recoverable: true,
};

describe("AssistantHistory retention controls", () => {
  test("requires explicit confirmation before requesting deletion", async () => {
    const onDelete = jest.fn().mockResolvedValue(true);
    render(
      <AssistantHistory
        threads={[active]}
        selectedThreadId={active.id}
        loading={false}
        onSelect={jest.fn()}
        onArchive={jest.fn()}
        onDelete={onDelete}
        onRestore={jest.fn().mockResolvedValue(true)}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Active planning" }),
    );
    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("group", {
        name: "Confirm deletion of Active planning",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(active.id));
  });

  test("shows recovery deadline and restores only a recoverable chat", async () => {
    const onRestore = jest.fn().mockResolvedValue(true);
    render(
      <AssistantHistory
        threads={[active, deleted]}
        selectedThreadId={active.id}
        loading={false}
        onSelect={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn().mockResolvedValue(true)}
        onRestore={onRestore}
      />,
    );

    expect(screen.getByText("Recently deleted")).toBeInTheDocument();
    expect(screen.getByText("Restore before Aug 28")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Restore Deleted planning" }),
    );
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(deleted.id));
  });
});
