import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddProposalUpload from "./AddProposalUpload";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/app/actions/proposals", () => ({
  createProposalAction: jest.fn(async () => ({ success: true, message: "ok", data: { _id: "abc123abc123abc123abc123" } })),
}));

import { createProposalAction } from "@/app/actions/proposals";

const props = {
  selectedFile: null,
  setSelectedFile: jest.fn(),
  onContinueWithUpload: jest.fn(),
  onContinueWithoutUpload: jest.fn(),
};

describe("assisted proposal start", () => {
  const savedFlag = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;
  afterAll(() => {
    if (savedFlag === undefined) delete process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = savedFlag;
  });

  it("creates a draft and routes to the workspace when the flag is on", async () => {
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = "true";
    render(<AddProposalUpload {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /start with assistant/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/proposals/proposal-edit?proposalId=abc123abc123abc123abc123"));
    expect(createProposalAction).toHaveBeenCalledWith(
      expect.objectContaining({ status: "unsubmitted", isDraft: true, event: { eventName: "Untitled proposal" } }),
    );
  });

  it("hides the assisted card when the flag is off", () => {
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = "false";
    render(<AddProposalUpload {...props} />);
    expect(screen.queryByRole("button", { name: /start with assistant/i })).toBeNull();
  });
});
