import { fireEvent, render, screen } from "@testing-library/react";

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

test("requires an explicit codec and 4K choice when recording is enabled", () => {
  const onContinue = jest.fn();
  const onChange = jest.fn();
  render(
    <VideoRecordingStep
      data={{ ...defaultVideoRecording(), videoRecordingRequired: "YES" }}
      onChange={onChange}
      onContinue={onContinue}
      onBack={jest.fn()}
      showErrors={false}
      proposalSettings={settings}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /Venue & Technical/i }));
  expect(onContinue).not.toHaveBeenCalled();
  expect(screen.getByText("Choose Yes or No.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /No — No recording needed/i }));
  expect(onChange).toHaveBeenCalledWith({
    videoRecordingRequired: "NO",
    recordingCodec: "",
    recordIn4k: "",
  });
});

test("accepts vendor recommendation as an explicit recording format", () => {
  const onContinue = jest.fn();
  render(<VideoRecordingStep data={{ ...defaultVideoRecording(), videoRecordingRequired: "YES", recordingCodec: "Vendor recommendation", recordIn4k: "NO" }} onChange={jest.fn()} onContinue={onContinue} onBack={jest.fn()} showErrors={false} proposalSettings={settings} />);
  expect(screen.getByRole("combobox", { name: "Recording codec" })).toHaveTextContent("Vendor recommendation");
  fireEvent.click(screen.getByRole("button", { name: /Venue & Technical/i }));
  expect(onContinue).toHaveBeenCalledTimes(1);
});
