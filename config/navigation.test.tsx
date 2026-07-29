import { navigationConfig } from "./navigation";

describe("Primary navigation", () => {
  test("keeps the AI Assistant out of route navigation", () => {
    const labels = navigationConfig.map((item) => item.title);
    expect(labels).toEqual(["Dashboard", "Proposals", "Email", "Setting"]);
    expect(navigationConfig).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/ai-assistant" }),
      ]),
    );
  });
});
