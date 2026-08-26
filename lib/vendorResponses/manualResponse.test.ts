import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import {
  existingVendorSummaries,
  isManualResponseReason,
} from "./manualResponse";

const response = (
  overrides: Partial<VendorResponseItem> = {},
): VendorResponseItem => ({
  _id: "response-1",
  proposalId: "proposal-1",
  proposalOwnerId: "owner-1",
  proposalTitle: "Summit",
  vendorName: "Apex AV",
  submittedBy: "Avery",
  email: " Sales@Apex.Example ",
  message: "",
  documents: [],
  isRead: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  currentVersionNumber: 2,
  ...overrides,
});

it("normalizes vendor emails so a manual entry matches an existing response", () => {
  expect(existingVendorSummaries([response()])).toEqual([
    { email: "sales@apex.example", vendorName: "Apex AV", versionNumber: 2 },
  ]);
});

it("treats a response without version history as version 1", () => {
  expect(
    existingVendorSummaries([response({ currentVersionNumber: undefined })])[0]
      .versionNumber,
  ).toBe(1);
});

it("accepts only the revision reasons the backend allows", () => {
  expect(isManualResponseReason("bafo")).toBe(true);
  expect(isManualResponseReason("initial")).toBe(false);
  expect(isManualResponseReason("winner_selected")).toBe(false);
});
