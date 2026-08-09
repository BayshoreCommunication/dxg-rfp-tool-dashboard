import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  defaultRoom,
  functionDateTimeValue,
  functionScheduleEndIsAfterStart,
  missingRoomFields,
  parseScheduleWorkbook,
  venueTimeValue,
} from "./RoomAndProductionStep";
import { SCREEN_SIZE_OTHER } from "../screenSize";

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
      screenSize: SCREEN_SIZE_OTHER,
      screenSizeOther: "",
    };

    expect(missingRoomFields(room)).toContain("custom screen size");
    room.largeMonitorsOrScreenProjector.screenSizeOther = "22' × 12' rear projection";
    expect(missingRoomFields(room)).not.toContain("custom screen size");
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
