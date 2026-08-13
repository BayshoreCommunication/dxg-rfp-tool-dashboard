const intelligenceTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export const formatIntelligenceTimestamp = (value: string): string =>
  `${intelligenceTimestampFormatter.format(new Date(value))} UTC`;
