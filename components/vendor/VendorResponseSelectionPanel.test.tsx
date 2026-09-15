import { deleteSelectedVendorResponsesAction } from "@/app/actions/vendorResponse";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VendorResponseSelectionPanel from "./VendorResponseSelectionPanel";

const refresh = jest.fn();

jest.mock("@/app/actions/vendorResponse", () => ({
  deleteSelectedVendorResponsesAction: jest.fn(),
  deleteVendorResponseAction: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn() },
}));

const responses = [
  { responseId: "response-1", vendorName: "Northstar AV" },
  { responseId: "response-2", vendorName: "Apex Events" },
  { responseId: "response-3", vendorName: "Bright Stage" },
];

const renderPanel = () =>
  render(
    <VendorResponseSelectionPanel
      responses={responses}
      actions={<button type="button">Add response manually</button>}
    >
      <article>Northstar card</article>
      <article>Apex card</article>
      <article>Bright card</article>
    </VendorResponseSelectionPanel>,
  );

beforeEach(() => jest.clearAllMocks());

it("enters a clear selection mode without preselecting responses", async () => {
  const user = userEvent.setup();
  renderPanel();

  expect(screen.getByRole("button", { name: "Add response manually" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Select responses" }));

  expect(screen.queryByRole("button", { name: "Add response manually" })).not.toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Select all" })).not.toBeChecked();
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();
});

it("deletes only checked responses and exits selection after success", async () => {
  const user = userEvent.setup();
  jest.mocked(deleteSelectedVendorResponsesAction).mockResolvedValue({
    success: true,
    message: "2 vendor responses deleted",
    deletedCount: 2,
  });
  renderPanel();

  await user.click(screen.getByRole("button", { name: "Select responses" }));
  await user.click(screen.getByRole("checkbox", { name: "Select Northstar AV" }));
  await user.click(screen.getByRole("checkbox", { name: "Select Bright Stage" }));
  expect(screen.getByText("2 selected")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Delete selected (2)" }));
  expect(
    screen.getByRole("alertdialog", {
      name: "Delete 2 selected responses?",
    }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Delete 2 responses" }));

  await waitFor(() =>
    expect(deleteSelectedVendorResponsesAction).toHaveBeenCalledWith([
      "response-1",
      "response-3",
    ]),
  );
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Select responses" })).toBeInTheDocument();
});

it("supports select all and cancel without deleting", async () => {
  const user = userEvent.setup();
  renderPanel();

  await user.click(screen.getByRole("button", { name: "Select responses" }));
  await user.click(screen.getByRole("checkbox", { name: "Select all" }));
  expect(screen.getByText("3 selected")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Select Apex Events" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(deleteSelectedVendorResponsesAction).not.toHaveBeenCalled();
});

it("highlights the selected card without drawing an outer selection rail", async () => {
  const user = userEvent.setup();
  const { container } = renderPanel();

  await user.click(screen.getByRole("button", { name: "Select responses" }));
  await user.click(screen.getByRole("checkbox", { name: "Select Northstar AV" }));

  const selectedCard = container.querySelector('[data-selected="true"]');
  expect(selectedCard).toHaveClass("[&_article]:border-brand");
  expect(selectedCard).not.toHaveClass("ring-2", "ring-brand");
  expect(screen.getByText("Select Northstar AV").closest("label")).toHaveClass(
    "border-brand",
    "bg-brand-muted",
  );
});
