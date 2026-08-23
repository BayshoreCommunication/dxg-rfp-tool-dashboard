import { renderHook } from "@testing-library/react";
import useAssistantUiContext from "./useAssistantUiContext";

jest.mock("next/navigation", () => ({
  usePathname: () => "/proposals/add-new-proposal",
}));

describe("useAssistantUiContext", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  test("ignores a stale retired recording section in the document context", () => {
    const section = document.createElement("section");
    section.dataset.assistantCurrentSection = "true";
    section.dataset.assistantSectionId = "video_recording";
    section.dataset.assistantEventFormat = "hybrid";
    const field = document.createElement("input");
    field.dataset.assistantFieldKey =
      "/content/videoRecordingStep/deliveryMethod";
    field.dataset.assistantRoomIdentifier = "stale-recording-room";
    section.append(field);
    document.body.append(section);
    field.focus();

    const { result } = renderHook(() => useAssistantUiContext());

    expect(result.current).toEqual({
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "proposal_creation",
      workflow: "proposal_intake",
      eventFormat: "hybrid",
    });
  });
});
