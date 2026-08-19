import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import VenueScheduleStep, {
  defaultVenueSchedule,
  type VenueScheduleData,
} from "./VenueScheduleStep";

const proposalSettings = {
  branding: { linkPrefix: "", defaultFont: "Inter" as const },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "USD",
    expiryDate: "",
    priceSeparator: ",",
    dateFormat: "YYYY-MM-DD",
    decimalPrecision: "2",
  },
};

function Harness({ initial = {} }: { initial?: Partial<VenueScheduleData> }) {
  const [data, setData] = useState<VenueScheduleData>({
    ...defaultVenueSchedule(),
    ...initial,
  });
  return (
    <VenueScheduleStep
      data={data}
      onChange={(updates) => setData((current) => ({ ...current, ...updates }))}
      onContinue={() => undefined}
      onBack={() => undefined}
      showErrors={false}
      proposalSettings={proposalSettings}
      mode="basic"
    />
  );
}

describe("VenueScheduleStep time-zone automation", () => {
  it("renders one normalized option for a legacy saved label", () => {
    render(<Harness initial={{
      venueCity: "Chicago",
      venueState: "IL",
      timeZone: "Central Time (CT)",
    }} />);

    const timeZone = screen.getByLabelText("Venue time zone");
    expect(timeZone).toHaveTextContent("America/Chicago");
    fireEvent.click(timeZone);
    expect(screen.getAllByRole("option", { name: /America\/Chicago/ })).toHaveLength(1);
  });

  it("selects by location, refines split-zone cities, and preserves a manual choice", () => {
    render(<Harness />);

    fireEvent.click(screen.getByLabelText("Venue state"));
    fireEvent.click(screen.getByRole("option", { name: "Florida" }));
    expect(screen.getByLabelText("Venue time zone")).toHaveTextContent(
      "America/New_York",
    );

    fireEvent.change(screen.getByLabelText("Venue city"), {
      target: { value: "Pensacola" },
    });
    expect(screen.getByLabelText("Venue time zone")).toHaveTextContent(
      "America/Chicago",
    );

    fireEvent.click(screen.getByLabelText("Venue time zone"));
    fireEvent.click(screen.getByRole("option", { name: /America\/Denver/ }));
    fireEvent.change(screen.getByLabelText("Venue city"), {
      target: { value: "Miami" },
    });
    expect(screen.getByLabelText("Venue time zone")).toHaveTextContent(
      "America/Denver",
    );
  });
});
