/** @jest-environment node */

jest.mock("server-only", () => ({}));

const cookieJar: { name: string; value: string }[] = [];
jest.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => cookieJar }),
}));

const getToken = jest.fn();
jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => getToken(...args),
}));

import { getBackendSession } from "./backendSession";

describe("getBackendSession cookie choice", () => {
  beforeEach(() => {
    cookieJar.length = 0;
    getToken.mockReset();
    getToken.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
  });

  it("reads the plain session cookie over http, even in a production build", async () => {
    cookieJar.push({ name: "authjs.session-token", value: "jwt" });
    const session = await getBackendSession();
    expect(getToken).toHaveBeenCalledWith(expect.objectContaining({ secureCookie: false }));
    expect(session.accessToken).toBe("access");
  });

  it("reads the __Secure- cookie over https, including a chunked one", async () => {
    cookieJar.push({ name: "__Secure-authjs.session-token.0", value: "jwt-part" });
    await getBackendSession();
    expect(getToken).toHaveBeenCalledWith(expect.objectContaining({ secureCookie: true }));
  });
});
