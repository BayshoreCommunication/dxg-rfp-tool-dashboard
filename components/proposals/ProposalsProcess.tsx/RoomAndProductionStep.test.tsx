import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { parseScheduleWorkbook } from "./RoomAndProductionStep";

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
