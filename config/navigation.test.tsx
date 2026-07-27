describe("AI Assistant navigation", () => {
  const savedFlag = process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED;

  afterAll(() => {
    if (savedFlag === undefined) {
      delete process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = savedFlag;
    }
  });

  test("places AI Assistant after Proposals when enabled", async () => {
    process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = "true";
    jest.resetModules();
    const { navigationConfig } = await import("./navigation");
    const labels = navigationConfig.map((item) => item.title);
    expect(labels).toEqual([
      "Dashboard",
      "Proposals",
      "AI Assistant",
      "Email",
      "Setting",
    ]);
    expect(navigationConfig[2]).toMatchObject({
      id: "ai-assistant",
      href: "/ai-assistant",
    });
  });

  test("hides the item when the public visibility flag is off", async () => {
    process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = "false";
    jest.resetModules();
    const { navigationConfig } = await import("./navigation");
    expect(
      navigationConfig.some((item) => item.id === "ai-assistant"),
    ).toBe(false);
  });
});
