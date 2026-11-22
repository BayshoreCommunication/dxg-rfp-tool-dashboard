import { render, screen } from "@testing-library/react";

import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import HybridVirtualStep from "./HybridVirtualStep";

const settings = { branding: { linkPrefix: "", defaultFont: "Inter" }, proposals: {} } as never;

const emptyData = {
  virtualAttendeeEstimate: "", streamingPlatform: "", streamingPlatformOther: "",
  platformIntegrationWithAv: "", streamOwnership: "",
  remoteSpeakers: { remoteSpeakers: "", howManyRemoteSpeakers: "", remoteFeedPlatform: "", techRehearsalOwner: "" },
  liveVirtualQa: "", virtualOnlyBreakouts: "", dedicatedVirtualProducer: "",
  closedCaptions: { closedCaptions: "", captionLanguages: [], captionLanguageOther: "", captionType: "" },
  onDemandRecording: "", sponsorOverlays: "", virtualNetworking: "",
};

const renderStep = (data: Record<string, unknown> = {}) =>
  render(
    <HybridVirtualStep
      data={{ ...emptyData, ...data } as never}
      onChange={jest.fn()}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors
      proposalSettings={settings}
      eventFormat="Hybrid"
    />,
  );

describe("HybridVirtualStep accessibility wiring", () => {
  test("text controls and selects are reachable by their visible label", () => {
    renderStep();
    expect(screen.getByLabelText(/^Virtual Attendee Estimate/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Streaming Platform/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Stream Ownership/ })).toBeInTheDocument();
  });

  test("every Yes/No question is a named radio group", () => {
    renderStep();
    for (const name of [
      /Platform Integration with In-Room AV/, /Remote Speakers Presenting Into Room/, /Live Virtual Q&A/,
      /Virtual-Only Breakout Sessions/, /Dedicated Virtual Producer/, /Closed Captions/,
      /On-Demand Recording/, /Sponsor Overlays on Stream/, /Virtual Networking/,
    ]) {
      expect(screen.getByRole("radiogroup", { name })).toBeInTheDocument();
    }
  });

  test("conditional sub-questions are labelled once their trigger is Yes", () => {
    renderStep({
      remoteSpeakers: { remoteSpeakers: "YES", howManyRemoteSpeakers: "", remoteFeedPlatform: "", techRehearsalOwner: "" },
      closedCaptions: { closedCaptions: "YES", captionLanguages: [], captionLanguageOther: "", captionType: "" },
    });
    expect(screen.getByLabelText(/^How Many Remote Speakers/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Remote Feed Platform/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Tech Rehearsal Owner/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Languages/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Caption Source/ })).toBeInTheDocument();
  });

  test("no dangling references, duplicate ids or buttons inside labels", () => {
    renderStep({
      remoteSpeakers: { remoteSpeakers: "YES", howManyRemoteSpeakers: "", remoteFeedPlatform: "", techRehearsalOwner: "" },
      closedCaptions: { closedCaptions: "YES", captionLanguages: [], captionLanguageOther: "", captionType: "" },
    });
    expect(danglingReferences()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
    expect(buttonsInsideLabels()).toBe(0);
  });
});
