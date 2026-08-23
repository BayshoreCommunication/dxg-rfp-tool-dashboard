import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddProposalUpload from "./AddProposalUpload";

const push = jest.fn();
const mockPdfText = jest.fn();
const mockPdfSave = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/app/actions/proposals", () => ({
  createProposalAction: jest.fn(async () => ({ success: true, message: "ok", data: { _id: "abc123abc123abc123abc123" } })),
}));
jest.mock("jspdf", () => ({
  jsPDF: jest.fn(() => ({
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    },
    addPage: jest.fn(),
    getNumberOfPages: () => 1,
    line: jest.fn(),
    rect: jest.fn(),
    roundedRect: jest.fn(),
    save: mockPdfSave,
    setDrawColor: jest.fn(),
    setFillColor: jest.fn(),
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    setPage: jest.fn(),
    setTextColor: jest.fn(),
    text: mockPdfText,
  })),
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
  beforeEach(() => {
    mockPdfText.mockClear();
    mockPdfSave.mockClear();
  });
  afterAll(() => {
    if (savedFlag === undefined) delete process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED;
    else process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = savedFlag;
  });

  it("creates a draft and routes to the workspace when the flag is on", async () => {
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = "true";
    render(<AddProposalUpload {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /start with assistant/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/proposals/abc123abc123abc123abc123/assistant"));
    expect(createProposalAction).toHaveBeenCalledWith(
      expect.objectContaining({ status: "unsubmitted", isDraft: true, event: { eventName: "Untitled proposal" } }),
    );
  });

  it("hides the assisted card when the flag is off", () => {
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = "false";
    render(<AddProposalUpload {...props} />);
    expect(screen.queryByRole("button", { name: /start with assistant/i })).toBeNull();
  });

  it("hides the standalone recording guide group and compacts later numbers", () => {
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = "false";
    render(<AddProposalUpload {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "What to include?" }));

    const visibleHeadings = [
      "1 · Event Overview",
      "2 · Venue Schedule",
      "3 · AV & Production Crew",
      "4 · Hybrid & Virtual",
      "5 · Content & Creative",
      "6 · Venue Technical",
      "7 · Budget & Preferences",
      "8 · Contact Information",
    ];
    visibleHeadings.forEach((heading) => {
      expect(screen.getByText(heading)).toBeInTheDocument();
    });
    expect(screen.getByText("Cameras, video recording type & playback")).toBeInTheDocument();
    expect(screen.queryByText("Video Recording")).not.toBeInTheDocument();
    expect(screen.queryByText(/video recording required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/iso recordings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw footage turnover/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/all 9 form steps/i)).not.toBeInTheDocument();
    expect(screen.getByText(/pre-fills proposal sections/i)).toBeInTheDocument();
  });

  it("downloads a compact sample PDF without the standalone recording section", async () => {
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED = "false";
    render(<AddProposalUpload {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "What to include?" }));
    fireEvent.click(screen.getByRole("button", { name: "Download Sample (PDF)" }));

    await waitFor(() => expect(mockPdfSave).toHaveBeenCalled());
    const renderedText = mockPdfText.mock.calls.map(([copy]) => copy);

    expect(renderedText).toContain("6 — VENUE TECHNICAL");
    expect(renderedText).toContain("7 — BUDGET & PREFERENCES");
    expect(renderedText).toContain("8 — CONTACT INFORMATION");
    expect(renderedText).not.toContain("6 — VIDEO RECORDING");
    expect(renderedText).not.toContain("Video Recording");
    expect(renderedText).not.toContain("Video Recording Required");
    expect(renderedText).not.toContain("Camera Operators & ISO Recordings");
    expect(renderedText).not.toContain("Raw Footage Turnover");
  });
});
