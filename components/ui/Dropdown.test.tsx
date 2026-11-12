import { fireEvent, render, screen } from "@testing-library/react";
import { Archive, Pencil } from "lucide-react";
import { Dropdown } from "./Dropdown";

const renderMenu = (onEdit = jest.fn(), onArchive = jest.fn()) =>
  render(
    <Dropdown.Root>
      <Dropdown.DotsButton aria-label="Actions for Spring Gala" />
      <Dropdown.Popover>
        <Dropdown.Menu aria-label="Actions for Spring Gala">
          <Dropdown.Item id="edit" label="Edit" icon={Pencil} onAction={onEdit} />
          <Dropdown.Item id="copy" label="Duplicate" hint="Your plan's limit is reached" isDisabled />
          <Dropdown.Separator />
          <Dropdown.Item id="archive" label="Archive" icon={Archive} tone="danger" onAction={onArchive} />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>,
  );

describe("Dropdown", () => {
  test("the trigger is a named button that opens a menu of the items", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Actions for Spring Gala" });
    expect(trigger).toHaveAttribute("aria-haspopup");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Actions for Spring Gala" })).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Edit", "DuplicateYour plan's limit is reached", "Archive"]);
    expect(screen.getByRole("menuitem", { name: /Duplicate/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  test("choosing an item runs its action and closes the menu", () => {
    const onEdit = jest.fn();
    const onArchive = jest.fn();
    renderMenu(onEdit, onArchive);
    fireEvent.click(screen.getByRole("button", { name: "Actions for Spring Gala" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("Escape closes the menu", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Actions for Spring Gala" }));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
