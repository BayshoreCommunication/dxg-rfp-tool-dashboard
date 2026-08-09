import { render, screen } from "@testing-library/react";

import VideoRecordingStep, { defaultVideoRecording } from "./VideoRecordingStep";
import type { ProposalSettings } from "../AddNewProposal";

const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: {},
} as ProposalSettings;

test("camera quantities and positions are editable only in Room Specifications", () => {
  render(
    <VideoRecordingStep
      data={{ ...defaultVideoRecording(), videoRecordingRequired: "YES" }}
      onChange={jest.fn()}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={false}
      proposalSettings={settings}
    />,
  );

  expect(screen.queryByText(/Number of Cameras Required/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Camera Positions Needed/i)).not.toBeInTheDocument();
  expect(screen.getByText(/ISO Recording Strategy/i)).toBeInTheDocument();
  expect(screen.getByText(/Recording & Deliverables/i)).toBeInTheDocument();
});
