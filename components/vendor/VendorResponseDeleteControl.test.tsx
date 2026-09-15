import {
  deleteSelectedVendorResponsesAction,
  deleteVendorResponseAction,
} from "@/app/actions/vendorResponse";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";
import VendorResponseDeleteControl from "./VendorResponseDeleteControl";

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

beforeEach(() => jest.clearAllMocks());

it("confirms a single response deletion and refreshes the list", async () => {
  const user = userEvent.setup();
  jest.mocked(deleteVendorResponseAction).mockResolvedValue({
    success: true,
    message: "Vendor response deleted",
    deletedCount: 1,
  });
  render(
    <VendorResponseDeleteControl
      scope="single"
      responseId="response-1"
      vendorName="Northstar AV"
    />,
  );

  await user.click(
    screen.getByRole("button", {
      name: "Delete response from Northstar AV",
    }),
  );
  const dialog = screen.getByRole("alertdialog", {
    name: "Delete response from “Northstar AV”?",
  });
  expect(dialog).toHaveTextContent("submission history, and generated analysis");
  expect(dialog).toHaveTextContent("This action cannot be undone.");
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

  await user.click(screen.getByRole("button", { name: "Delete response" }));

  await waitFor(() =>
    expect(deleteVendorResponseAction).toHaveBeenCalledWith("response-1"),
  );
  expect(toast.success).toHaveBeenCalledWith("Vendor response deleted");
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("keeps the response when the planner cancels", async () => {
  const user = userEvent.setup();
  render(
    <VendorResponseDeleteControl
      scope="single"
      responseId="response-1"
      vendorName="Northstar AV"
    />,
  );

  await user.click(
    screen.getByRole("button", {
      name: "Delete response from Northstar AV",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(deleteVendorResponseAction).not.toHaveBeenCalled();
});

it("deletes only the selected response ids", async () => {
  const user = userEvent.setup();
  jest.mocked(deleteSelectedVendorResponsesAction).mockResolvedValue({
    success: true,
    message: "3 vendor responses deleted",
    deletedCount: 3,
  });
  render(
    <VendorResponseDeleteControl
      scope="selected"
      count={3}
      responseIds={["response-1", "response-2", "response-3"]}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: "Delete selected (3)" }),
  );
  expect(
    screen.getByRole("alertdialog", {
      name: "Delete 3 selected responses?",
    }),
  ).toHaveTextContent("their attachments and generated analysis");
  await user.click(
    screen.getByRole("button", { name: "Delete 3 responses" }),
  );

  await waitFor(() =>
    expect(deleteSelectedVendorResponsesAction).toHaveBeenCalledWith([
      "response-1",
      "response-2",
      "response-3",
    ]),
  );
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("keeps the dialog open and shows a server failure", async () => {
  const user = userEvent.setup();
  jest.mocked(deleteSelectedVendorResponsesAction).mockResolvedValue({
    success: false,
    message: "You do not have permission to delete these responses.",
  });
  render(
    <VendorResponseDeleteControl
      scope="selected"
      count={2}
      responseIds={["response-1", "response-2"]}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: "Delete selected (2)" }),
  );
  expect(screen.getByRole("alertdialog")).toHaveTextContent("their attachments and generated analysis");
  await user.click(
    screen.getByRole("button", { name: "Delete 2 responses" }),
  );

  expect(
    await screen.findByRole("alert"),
  ).toHaveTextContent("You do not have permission");
  expect(refresh).not.toHaveBeenCalled();
});
