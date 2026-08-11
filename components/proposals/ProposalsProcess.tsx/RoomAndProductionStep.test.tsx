import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { ProposalSettings } from "../AddNewProposal";
import RoomAndProductionStep, {
  defaultRoom,
  functionScheduleDateIsWithinEventRange,
  functionDateTimeValue,
  functionScheduleEndIsAfterStart,
  missingRoomFields,
  parseScheduleWorkbook,
  roomProductionAccessTimeErrors,
  roomFromTemplate,
  ROOM_TEMPLATES,
  venueTimeValue,
} from "./RoomAndProductionStep";
import {
  SCREEN_SIZE_OTHER,
  SCREEN_SIZE_VENDOR_RECOMMENDATION,
} from "../screenSize";

jest.mock("@/app/actions/proposals", () => ({
  normalizeScheduleTimesAction: jest.fn(),
}));
jest.mock("../RoomRecommendationsPanel", () => ({
  __esModule: true,
  default: () => null,
}));

const workbookBuffer = (rows: Record<string, unknown>[]) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Schedule");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
};

const proposalSettings: ProposalSettings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "USD",
    expiryDate: "",
    priceSeparator: ",",
    dateFormat: "MM-DD-YYYY",
    decimalPrecision: "2",
  },
};

describe("scenic inspiration navigation", () => {
  it("directs planners from scenic notes to Section 7", () => {
    const onOpenScenicInspirations = jest.fn();

    render(
      <RoomAndProductionStep
        rooms={[{ ...defaultRoom(), scenicStageDesign: "Yes" }]}
        onRoomsChange={jest.fn()}
        numberOfEventRooms="1"
        onNumberOfEventRoomsChange={jest.fn()}
        onContinue={jest.fn()}
        onBack={jest.fn()}
        proposalSettings={proposalSettings}
        onOpenScenicInspirations={onOpenScenicInspirations}
      />,
    );

    const uploadLink = screen.getByRole("button", {
      name: "Upload scenic inspiration files in Section 7 — Uploads & Co-Vendors →",
    });
    fireEvent.click(uploadLink);

    expect(onOpenScenicInspirations).toHaveBeenCalledTimes(1);
  });
});

describe("parseScheduleWorkbook", () => {
  it("groups multiple functions in the same physical room under one shared AV module", async () => {
    const buffer = workbookBuffer([
      {
        Date: "2026-08-10",
        Day: "Monday",
        "Start Time": "9:00 AM",
        "End Time": "10:00 AM",
        "Function Name": "Opening keynote",
        "Room Name": "Grand Ballroom",
        "Room Set": "Theater",
        "# of Attendees": 500,
      },
      {
        Date: "2026-08-10",
        Day: "Monday",
        "Start Time": "11:00 AM",
        "End Time": "12:00 PM",
        "Function Name": "Leadership panel",
        "Room Name": "Grand Ballroom",
        "Room Set": "Theater",
        "# of Attendees": 450,
      },
    ]);

    const result = await parseScheduleWorkbook(buffer, async (values) => values.map(() => null));

    expect(result.totalRows).toBe(2);
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].roomLocation).toBe("Grand Ballroom");
    expect(result.rooms[0].functions.map((entry) => entry.functionName)).toEqual([
      "Opening keynote",
      "Leadership panel",
    ]);
    expect(result.rooms[0].functions[0].showStartDateTime)
      .not.toEqual(result.rooms[0].functions[1].showStartDateTime);
    expect(new Date(result.rooms[0].functions[0].showStartDateTime).getHours()).toBe(9);
    expect(new Date(result.rooms[0].functions[1].showStartDateTime).getHours()).toBe(11);
    expect(result.rooms[0].estimatedAttendeesInRoom).toBe("500");
  });

  it("ships the downloadable schedule template without sample records", () => {
    const template = readFileSync(
      path.join(process.cwd(), "public/files/RFPilot schedule-example-sheet.xlsx"),
    );
    const workbook = XLSX.read(template, { type: "buffer" });
    const scheduleSheet = workbook.Sheets["in person schedule"];

    expect(scheduleSheet).toBeDefined();
    expect(
      XLSX.utils.sheet_to_json(scheduleSheet, { defval: "" }),
    ).toEqual([]);
  });
});

describe("mandatory function schedules", () => {
  const completeRoom = () => ({
    ...defaultRoom(),
    roomLocation: "Grand Ballroom",
    showCrewNeeded: ["A1 (Audio Engineer)"],
    functions: [{
      functionName: "Opening keynote",
      scheduleDate: "2026-08-10",
      scheduleDay: "Monday",
      showStartDateTime: "2026-08-10T13:00:00.000Z",
      showEndDateTime: "2026-08-10T14:00:00.000Z",
      roomSetup: "Theater",
      estimatedAttendees: "500",
    }],
  });

  it("requires the five critical values for every function", () => {
    const room = completeRoom();
    expect(missingRoomFields(room)).toEqual([]);

    room.functions[0] = {
      ...room.functions[0],
      scheduleDate: "",
      showStartDateTime: "",
      showEndDateTime: "",
      estimatedAttendees: "0",
    };
    expect(missingRoomFields(room)).toEqual([
      "number of attendees",
      "date",
      "start time",
      "end time",
    ]);
  });

  it("requires each end time to be later than its start time", () => {
    const room = completeRoom();
    room.functions[0].showEndDateTime = room.functions[0].showStartDateTime;

    expect(functionScheduleEndIsAfterStart(room.functions[0])).toBe(false);
    expect(missingRoomFields(room)).toContain("end time after start time");
  });

  it("accepts function dates on either event boundary and rejects dates outside it", () => {
    expect(functionScheduleDateIsWithinEventRange("2026-08-10", "2026-08-10", "2026-08-12")).toBe(true);
    expect(functionScheduleDateIsWithinEventRange("2026-08-12", "2026-08-10", "2026-08-12")).toBe(true);
    expect(functionScheduleDateIsWithinEventRange("2026-08-09", "2026-08-10", "2026-08-12")).toBe(false);
    expect(functionScheduleDateIsWithinEventRange("2026-08-13", "2026-08-10", "2026-08-12")).toBe(false);
  });

  it("blocks Continue when a function date is outside the event window", () => {
    const room = completeRoom();
    room.functions[0].scheduleDate = "2026-08-13";

    expect(missingRoomFields(room, "advanced", "2026-08-10", "2026-08-12"))
      .toContain("date within event dates");
  });

  it("anchors time-only input to the function date in the venue time zone", () => {
    const start = functionDateTimeValue("2026-08-10", "09:15", "Central Time (CT)");

    expect(start).toBe("2026-08-10T14:15:00.000Z");
    expect(venueTimeValue(start, "Central Time (CT)")).toBe("09:15");
  });

  it("applies the same validation to imported spreadsheet functions", async () => {
    const buffer = workbookBuffer([{
      Date: "2026-08-10",
      "Start Time": "9:00 AM",
      "Function Name": "Opening keynote",
      "Room Name": "Grand Ballroom",
      "# of Attendees": 500,
    }]);
    const result = await parseScheduleWorkbook(buffer, async (values) => values.map(() => null));

    expect(missingRoomFields({
      ...result.rooms[0],
      showCrewNeeded: ["A1 (Audio Engineer)"],
    })).toContain("end time");
  });

  it("blocks Continue when Other lacks an explicit custom screen size", () => {
    const room = completeRoom();
    room.largeMonitorsOrScreenProjector = {
      largeMonitorsOrScreenProjector: "Yes",
      numberOfMonitors: "0",
      numberOfScreens: "2",
      monitorSize: "",
      monitorSizeOther: "",
      screenSize: SCREEN_SIZE_OTHER,
      screenSizeOther: "",
    };

    expect(missingRoomFields(room)).toContain("custom screen size");
    room.largeMonitorsOrScreenProjector.screenSizeOther = "22' × 12' rear projection";
    expect(missingRoomFields(room)).not.toContain("custom screen size");
  });

  it("blocks Continue when Other lacks an explicit custom monitor size", () => {
    const room = completeRoom();
    room.largeMonitorsOrScreenProjector = {
      largeMonitorsOrScreenProjector: "Yes",
      numberOfMonitors: "2",
      numberOfScreens: "0",
      monitorSize: SCREEN_SIZE_OTHER,
      monitorSizeOther: "",
      screenSize: "",
      screenSizeOther: "",
    };

    expect(missingRoomFields(room)).toContain("custom monitor size");
    room.largeMonitorsOrScreenProjector.monitorSizeOther = '85" wall-mounted';
    expect(missingRoomFields(room)).not.toContain("custom monitor size");
  });

  it("accepts Vendor Recommendation as a monitor size without further input", () => {
    const room = completeRoom();
    room.largeMonitorsOrScreenProjector = {
      largeMonitorsOrScreenProjector: "Yes",
      numberOfMonitors: "2",
      numberOfScreens: "0",
      monitorSize: SCREEN_SIZE_VENDOR_RECOMMENDATION,
      monitorSizeOther: "",
      screenSize: "",
      screenSizeOther: "",
    };

    expect(missingRoomFields(room)).not.toContain("custom monitor size");
  });

  it("keeps Basic mode validation to room and schedule essentials", () => {
    const room = completeRoom();
    room.showCrewNeeded = [];
    room.cameras = { ...room.cameras, cameras: "Yes", cameraPlanMode: "" };

    expect(missingRoomFields(room, "basic")).toEqual([]);
    expect(missingRoomFields(room, "advanced")).toEqual(
      expect.arrayContaining(["show crew", "camera plan"]),
    );
  });

  it("anchors generated room-template times to the venue time zone", () => {
    const room = roomFromTemplate(
      ROOM_TEMPLATES[0],
      "2026-08-20",
      "2026-08-20",
      "300",
      "Central Time (CT)",
    );

    expect(venueTimeValue(room.showStartDateTime, "Central Time (CT)")).toBe("09:00");
    expect(venueTimeValue(room.showEndDateTime, "Central Time (CT)")).toBe("17:00");
  });

  it("allows room access up to seven days before the event and rejects an eighth day", () => {
    const room = completeRoom();
    room.loadInDateTime = functionDateTimeValue("2026-08-03", "09:00", "Central Time (CT)");

    expect(roomProductionAccessTimeErrors(
      room,
      "2026-08-10",
      "2026-08-12",
      "Central Time (CT)",
    )).toEqual({});

    room.loadInDateTime = functionDateTimeValue("2026-08-02", "09:00", "Central Time (CT)");
    expect(roomProductionAccessTimeErrors(
      room,
      "2026-08-10",
      "2026-08-12",
      "Central Time (CT)",
    ).loadIn).toBe("Load-in can be no more than 7 days before the event.");
  });

  it("requires rehearsal to be on or after room load-in", () => {
    const room = completeRoom();
    room.loadInDateTime = functionDateTimeValue("2026-08-09", "12:00", "Central Time (CT)");
    room.rehearsalDateTime = functionDateTimeValue("2026-08-09", "11:45", "Central Time (CT)");

    expect(roomProductionAccessTimeErrors(
      room,
      "2026-08-10",
      "2026-08-12",
      "Central Time (CT)",
    ).rehearsal).toBe("Rehearsal must be on or after load-in.");
  });

  it("requires both room access milestones to precede the first function", () => {
    const room = completeRoom();
    room.loadInDateTime = room.functions[0].showStartDateTime;
    room.rehearsalDateTime = functionDateTimeValue("2026-08-10", "09:00", "Central Time (CT)");
    const errors = roomProductionAccessTimeErrors(
      room,
      "2026-08-10",
      "2026-08-12",
      "Central Time (CT)",
    );

    expect(errors.loadIn).toBe("Load-in must be before the room’s first function.");
    expect(errors.rehearsal).toBe("Rehearsal must be before the room’s first function.");
    expect(missingRoomFields(
      room,
      "advanced",
      "2026-08-10",
      "2026-08-12",
      "Central Time (CT)",
    )).toEqual(expect.arrayContaining(["valid load-in time", "valid rehearsal time"]));
  });
});

describe("multiple LED wall validation", () => {
  const completeRoom = () => ({
    ...defaultRoom(),
    roomLocation: "Grand Ballroom",
    roomFunction: "Keynote",
    scheduleDate: "2026-08-10",
    showStartDateTime: "2026-08-10T13:00:00.000Z",
    showEndDateTime: "2026-08-10T14:00:00.000Z",
    estimatedAttendeesInRoom: "500",
    showCrewNeeded: ["V1 (Video Engineer)"],
  });

  it("identifies the incomplete wall by its one-based number", () => {
    const missing = missingRoomFields({
      ...completeRoom(),
      ledWall: "Yes",
      ledWallCount: "2",
      ledWalls: [{
        width: "40", height: "15", shape: "Flat / Straight",
        pixelPitch: "2.6mm (Standard)", switcher: "Barco E2/E3", notes: "", specs: "",
      }],
    });
    expect(missing).toEqual(expect.arrayContaining(["LED wall 2 width", "LED wall 2 processor"]));
  });
});
