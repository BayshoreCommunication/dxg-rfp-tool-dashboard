/** @jest-environment node */

import { readNeedsOnboarding } from "./onboarding";

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("readNeedsOnboarding", () => {
  it.each(["details", "plan", "team"])("sends an Owner or Admin whose organization is at %s", async (step) => {
    const fetcher = respond(200, { onboardingStep: step, canManage: true });
    await expect(readNeedsOnboarding("access", fetcher)).resolves.toBe(true);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toMatch(/\/api\/organization\/profile$/);
    expect(init.headers).toEqual({ Authorization: "Bearer access" });
  });

  it("does not send members who can't manage, or once onboarding is done", async () => {
    await expect(readNeedsOnboarding("a", respond(200, { onboardingStep: "details", canManage: false }))).resolves.toBe(false);
    await expect(readNeedsOnboarding("a", respond(200, { onboardingStep: "done", canManage: true }))).resolves.toBe(false);
    // An older backend that knows nothing of onboarding.
    await expect(readNeedsOnboarding("a", respond(200, { needsName: true, canEditName: true }))).resolves.toBe(false);
  });

  it("never blocks a sign-in: errors, failures and missing tokens mean don't send", async () => {
    await expect(readNeedsOnboarding("a", respond(500, { onboardingStep: "details", canManage: true }))).resolves.toBe(false);
    await expect(readNeedsOnboarding("a", jest.fn().mockRejectedValue(new Error("down")))).resolves.toBe(false);
    const fetcher = jest.fn();
    await expect(readNeedsOnboarding(undefined, fetcher)).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
