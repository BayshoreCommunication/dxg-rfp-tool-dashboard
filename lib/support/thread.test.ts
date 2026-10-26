import type { SupportMessage } from "@/app/actions/supportDesk";
import { buildThreadItems, dayLabel, isAutomaticReply } from "./thread";

const msg = (id: string, authorRole: SupportMessage["authorRole"], createdAt: string, kind: SupportMessage["kind"] = "message"): SupportMessage => ({
  id, authorRole, kind, body: id, attachments: [], createdAt,
});

describe("support thread layout", () => {
  const now = new Date(2026, 9, 26, 15, 0);

  it("labels today, yesterday and older days", () => {
    expect(dayLabel(new Date(2026, 9, 26, 9, 0), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 25, 9, 0), now)).toBe("Yesterday");
    expect(dayLabel(new Date(2026, 9, 18, 9, 0), now)).toBe("Sunday, Oct 18");
    expect(dayLabel(new Date(2025, 0, 2, 9, 0), now)).toBe("Jan 2, 2025");
  });

  it("recognises the automatic acknowledgement but not status events", () => {
    expect(isAutomaticReply(msg("a", "system", "2026-10-26T10:00:00Z"))).toBe(true);
    expect(isAutomaticReply(msg("e", "system", "2026-10-26T10:00:00Z", "system"))).toBe(false);
    expect(isAutomaticReply(msg("c", "customer", "2026-10-26T10:00:00Z"))).toBe(false);
  });

  it("adds day separators and groups same-speaker bursts", () => {
    const day1 = new Date(2026, 9, 25, 9, 0).getTime();
    const day2 = new Date(2026, 9, 26, 9, 0).getTime();
    const at = (ms: number) => new Date(ms).toISOString();
    const items = buildThreadItems([
      msg("c1", "customer", at(day1)),
      msg("c2", "customer", at(day1 + 60_000)),
      msg("ack", "system", at(day1 + 61_000)),
      msg("ev", "system", at(day1 + 62_000), "system"),
      msg("a1", "agent", at(day2)),
      msg("a2", "agent", at(day2 + 10 * 60_000)),
    ], now);
    expect(items.map((item) => item.type === "message" ? `${item.key}:${item.startsGroup ? "S" : "-"}${item.endsGroup ? "E" : "-"}` : item.type === "day" ? `day:${item.label}` : `event:${item.key}`)).toEqual([
      "day:Yesterday",
      "c1:S-",
      "c2:-E",
      "ack:SE",
      "event:ev",
      "day:Today",
      "a1:SE",
      "a2:SE",
    ]);
  });

  it("omits day separators before hydration", () => {
    const items = buildThreadItems([msg("c1", "customer", "2026-10-26T10:00:00Z")], null);
    expect(items.map((item) => item.type)).toEqual(["message"]);
  });
});
