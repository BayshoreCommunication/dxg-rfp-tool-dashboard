import { fireEvent, render, screen } from "@testing-library/react";
import { AssistantLauncherProvider } from "@/components/ai-assistant/AssistantLauncherContext";
import { InfoTooltip } from "./shared";

describe("InfoTooltip field help", () => {
  test("sends canonical field and active form context to the assistant", () => {
    const requestFieldHelp = jest.fn();

    render(
      <AssistantLauncherProvider
        value={{ enabled: true, requestFieldHelp }}
      >
        <div
          data-assistant-current-section="true"
          data-assistant-section-id="event_overview"
          data-assistant-event-format="Hybrid"
        >
          <div data-assistant-field-key="/content/event/name">
            <label>
              Event Name *
              <InfoTooltip text="Use the public event name." />
            </label>
          </div>
        </div>
      </AssistantLauncherProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ask AI about this field",
      }),
    );

    expect(requestFieldHelp).toHaveBeenCalledWith({
      fieldLabel: "Event Name",
      fieldControl: {
        label: "Event Name",
        helperText: "Use the public event name.",
        requirement: "required",
      },
      fieldKey: "/content/event/name",
      sectionId: "event_overview",
      eventFormat: "hybrid",
    });
  });

  test("supports fields without a canonical key by using their visible label", () => {
    const requestFieldHelp = jest.fn();

    render(
      <AssistantLauncherProvider
        value={{ enabled: true, requestFieldHelp }}
      >
        <label>
          Venue Name
          <InfoTooltip text="Enter the venue." />
        </label>
      </AssistantLauncherProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ask AI about this field",
      }),
    );

    expect(requestFieldHelp).toHaveBeenCalledWith({
      fieldLabel: "Venue Name",
      fieldControl: {
        label: "Venue Name",
        helperText: "Enter the venue.",
      },
    });
  });

  test("captures visible choices and limits from the current rendered field", () => {
    const requestFieldHelp = jest.fn();

    render(
      <AssistantLauncherProvider value={{ enabled: true, requestFieldHelp }}>
        <div>
          <label>
            Tone / Brand Direction (optional)
            <InfoTooltip text="Select up to 5 tags that describe the intended style." />
          </label>
          <label>
            <input type="checkbox" value="Polished & Refined" />
            Polished &amp; Refined
          </label>
          <label>
            <input type="checkbox" value="Tech-Forward" />
            Tech-Forward
          </label>
        </div>
      </AssistantLauncherProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ask AI about this field" }),
    );

    expect(requestFieldHelp).toHaveBeenCalledWith({
      fieldLabel: "Tone / Brand Direction",
      fieldControl: {
        label: "Tone / Brand Direction",
        helperText: "Select up to 5 tags that describe the intended style.",
        requirement: "optional",
        controlType: "multi_select",
        options: ["Polished & Refined", "Tech-Forward"],
        maximumSelections: 5,
      },
    });
  });

  test("captures select options without sending the current field value", () => {
    const requestFieldHelp = jest.fn();

    render(
      <AssistantLauncherProvider value={{ enabled: true, requestFieldHelp }}>
        <div>
          <label>
            Event Type *
            <InfoTooltip text="Choose the event type that best matches the program." />
          </label>
          <select defaultValue="Conference">
            <option value="">Select event type...</option>
            <option value="Conference">Conference</option>
            <option value="Sales Kickoff">Sales Kickoff</option>
          </select>
        </div>
      </AssistantLauncherProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ask AI about this field" }),
    );

    expect(requestFieldHelp).toHaveBeenCalledWith({
      fieldLabel: "Event Type",
      fieldControl: {
        label: "Event Type",
        helperText: "Choose the event type that best matches the program.",
        requirement: "required",
        controlType: "select",
        options: ["Conference", "Sales Kickoff"],
        maximumSelections: 1,
      },
    });
    expect(JSON.stringify(requestFieldHelp.mock.calls)).not.toContain(
      '"value":"Conference"',
    );
  });

  test("keeps normal field information available when assistant access is disabled", () => {
    render(
      <AssistantLauncherProvider
        value={{ enabled: false, requestFieldHelp: jest.fn() }}
      >
        <label>
          Event Name
          <InfoTooltip text="Use the public event name." />
        </label>
      </AssistantLauncherProvider>,
    );

    expect(
      screen.getByRole("button", { name: "About this field" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Ask AI about this field",
      }),
    ).not.toBeInTheDocument();
  });
});
