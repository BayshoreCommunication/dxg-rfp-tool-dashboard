/** @jest-environment node */

// ORG-306: the Google callback's domain-match redirect and the one-shot
// "separate organization" flag. next-auth's encode/decode are stubbed (its
// ESM build doesn't load under jest); the stub checks the salt, as the real
// one does, so a value written for one cookie can't be read as another.

jest.mock("next-auth/jwt", () => ({
  encode: async ({ token, salt }: { token: object; salt: string }) =>
    Buffer.from(JSON.stringify({ salt, token })).toString("base64url"),
  decode: async ({ token, salt }: { token: string; salt: string }) => {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (parsed.salt !== salt) throw new Error("bad salt");
    return parsed.token;
  },
}));

const jar = new Map<string, string>();
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

import { GOOGLE_DOMAIN_MATCH_PATH, googleDomainMatchRedirect, googleSignInExtras } from "./googleSignup";
import { readGoogleDomainMatch, storeGoogleSeparateOrganization } from "./twoFactorPending";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-google-signup-cookies-0123456789";
});
beforeEach(() => jar.clear());

const match = { invited: false, errorCode: "ORGANIZATION_DOMAIN_MATCH", data: { organizationName: "Bayshore Communication" }, email: "laiba@bayshore.test" };

it("sends a matched first Google sign-in to /sign-up and keeps the details out of the URL", async () => {
  const path = await googleDomainMatchRedirect(match);
  expect(path).toBe(GOOGLE_DOMAIN_MATCH_PATH);
  expect(path).not.toContain("laiba");
  expect(path).not.toContain("Bayshore");
  expect(await readGoogleDomainMatch()).toEqual({ email: "laiba@bayshore.test", organizationName: "Bayshore Communication" });
});

it("leaves other refusals and invitation accepts to the existing error handling", async () => {
  expect(await googleDomainMatchRedirect({ ...match, errorCode: "SSO_REQUIRED" })).toBeNull();
  expect(await googleDomainMatchRedirect({ ...match, invited: true })).toBeNull();
  expect(await googleDomainMatchRedirect({ ...match, data: {} })).toBeNull();
  expect(jar.size).toBe(0);
});

it("sends separateOrganization once after the person chose it, never for an invitation", async () => {
  expect(await googleSignInExtras(false)).toEqual({});

  await storeGoogleSeparateOrganization();
  expect(await googleSignInExtras(true)).toEqual({});
  expect(await googleSignInExtras(false)).toEqual({ separateOrganization: true });
  expect(await googleSignInExtras(false)).toEqual({});
});

it("ignores a forged flag cookie, including one copied from the match cookie", async () => {
  jar.set("rfpilot-google-separate-org", "not-a-real-token");
  expect(await googleSignInExtras(false)).toEqual({});

  await googleDomainMatchRedirect(match);
  jar.set("rfpilot-google-separate-org", jar.get("rfpilot-google-domain-match")!);
  expect(await googleSignInExtras(false)).toEqual({});
});
