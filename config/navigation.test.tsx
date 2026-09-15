import { navigationConfig } from "./navigation";

describe("Primary navigation", () => {
  test("keeps the AI Assistant out of route navigation", () => {
    const labels = navigationConfig.map((item) => item.title);
    expect(labels).toEqual([
      "Dashboard",
      "Proposals",
      "Email",
      "Vendor Responses",
      "Help",
    ]);
    // Help is a plain route, reachable regardless of the AI Assistant flag.
    expect(navigationConfig).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "help", href: "/help" })]),
    );
    expect(navigationConfig).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/ai-assistant" }),
      ]),
    );
  });
});
