import { format, isSameDay, isSameYear, subDays } from "date-fns";
import type { SupportMessage } from "@/app/actions/supportDesk";
import { toAppDate } from "@/lib/dateFormat";

// Consecutive messages from the same side within this window read as one
// burst: one avatar and name, tighter spacing.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type ThreadItem =
  | { type: "day"; key: string; label: string }
  | { type: "event"; key: string; message: SupportMessage }
  | { type: "message"; key: string; message: SupportMessage; startsGroup: boolean; endsGroup: boolean };

/** The automatic acknowledgement the backend posts on every new ticket. */
export const isAutomaticReply = (message: SupportMessage) =>
  message.kind === "message" && message.authorRole === "system";

const speaker = (message: SupportMessage) =>
  isAutomaticReply(message) ? "automatic" : message.authorRole;

export const dayLabel = (date: Date, now: Date): string => {
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, subDays(now, 1))) return "Yesterday";
  return format(date, isSameYear(date, now) ? "EEEE, MMM d" : "MMM d, yyyy");
};

export const timeLabel = (value: unknown): string => {
  const date = toAppDate(value);
  return date ? format(date, "h:mm a") : "";
};

/**
 * Turns a flat message list into chat rows: a day separator whenever the
 * local day changes, status events as their own rows, and messages flagged
 * with where each same-speaker burst starts and ends. `now` is null before
 * hydration so the server and the first client render agree.
 */
export const buildThreadItems = (messages: SupportMessage[], now: Date | null): ThreadItem[] => {
  const items: ThreadItem[] = [];
  let lastDay: string | null = null;

  messages.forEach((message, index) => {
    const date = toAppDate(message.createdAt);
    if (now && date) {
      const day = format(date, "yyyy-MM-dd");
      if (day !== lastDay) {
        items.push({ type: "day", key: `day-${day}`, label: dayLabel(date, now) });
        lastDay = day;
      }
    }
    if (message.kind === "system") {
      items.push({ type: "event", key: message.id, message });
      return;
    }
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const continues = (a: SupportMessage | undefined, b: SupportMessage | undefined) => {
      if (!a || !b || a.kind === "system" || b.kind === "system") return false;
      if (speaker(a) !== speaker(b)) return false;
      const first = toAppDate(a.createdAt);
      const second = toAppDate(b.createdAt);
      if (!first || !second) return false;
      if (now && !isSameDay(first, second)) return false;
      return Math.abs(second.getTime() - first.getTime()) <= GROUP_WINDOW_MS;
    };
    items.push({
      type: "message",
      key: message.id,
      message,
      startsGroup: !continues(previous, message),
      endsGroup: !continues(message, next),
    });
  });

  return items;
};
