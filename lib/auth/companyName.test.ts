/** @jest-environment node */

import { readNeedsCompanyName } from "./companyName";

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("readNeedsCompanyName", () => {
  it("asks only when the organization needs a name and the user may give it", async () => {
    const fetcher = respond(200, { needsName: true, canEditName: true });
    await expect(readNeedsCompanyName("access", fetcher)).resolves.toBe(true);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toMatch(/\/api\/organization\/profile$/);
    expect(init.headers).toEqual({ Authorization: "Bearer access" });
  });

  it("does not ask a member who can't rename, or once it is named", async () => {
    await expect(readNeedsCompanyName("a", respond(200, { needsName: true, canEditName: false }))).resolves.toBe(false);
    await expect(readNeedsCompanyName("a", respond(200, { needsName: false, canEditName: true }))).resolves.toBe(false);
  });

  it("never blocks a sign-in: errors, failures and missing tokens mean don't ask", async () => {
    await expect(readNeedsCompanyName("a", respond(500, { needsName: true, canEditName: true }))).resolves.toBe(false);
    await expect(readNeedsCompanyName("a", jest.fn().mockRejectedValue(new Error("down")))).resolves.toBe(false);
    const fetcher = jest.fn();
    await expect(readNeedsCompanyName(undefined, fetcher)).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
